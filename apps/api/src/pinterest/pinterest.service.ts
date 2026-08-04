import { randomBytes, createHash } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinterestConnection } from './pinterest-connection.entity';

const AUTHORIZE_URL = 'https://www.pinterest.com/oauth/';
const TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token';
const API_BASE = 'https://api.pinterest.com/v5';
const SCOPE = 'boards:read,pins:read,user_accounts:read';

// Short-lived (5 min) - carries the PKCE verifier and the initiating user
// across the redirect to Pinterest and back, self-contained so no DB/Redis
// row is needed just to track an in-flight OAuth handshake. Signed with the
// same JWT_SECRET as session tokens (via AuthModule's exported JwtModule),
// but distinguishable by `purpose` so one can never be replayed as the other.
interface PinterestOAuthState {
  sub: string;
  codeVerifier: string;
  purpose: 'pinterest-oauth';
}

export interface PinterestBoard {
  id: string;
  name: string;
}

export interface PinterestPin {
  id: string;
  title: string;
  image: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

@Injectable()
export class PinterestService {
  constructor(
    @InjectRepository(PinterestConnection)
    private readonly connections: Repository<PinterestConnection>,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  isConfigured(): boolean {
    return !!(
      this.config.get<string>('PINTEREST_CLIENT_ID') &&
      this.config.get<string>('PINTEREST_CLIENT_SECRET') &&
      this.config.get<string>('PINTEREST_REDIRECT_URI')
    );
  }

  private clientId(): string {
    return this.config.get<string>('PINTEREST_CLIENT_ID')!;
  }

  private clientSecret(): string {
    return this.config.get<string>('PINTEREST_CLIENT_SECRET')!;
  }

  private redirectUri(): string {
    return this.config.get<string>('PINTEREST_REDIRECT_URI')!;
  }

  private appUrl(): string {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:4174';
  }

  appCallbackUrl(status: 'success' | 'error'): string {
    return `${this.appUrl()}/pinterest/callback?status=${status}`;
  }

  buildAuthorizeUrl(userId: string): string {
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(
      createHash('sha256').update(codeVerifier).digest(),
    );
    const state = this.jwtService.sign(
      {
        sub: userId,
        codeVerifier,
        purpose: 'pinterest-oauth',
      } satisfies PinterestOAuthState,
      { expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: SCOPE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  verifyState(state: string): PinterestOAuthState {
    try {
      const payload = this.jwtService.verify<PinterestOAuthState>(state);
      if (payload.purpose !== 'pinterest-oauth')
        throw new Error('wrong purpose');
      return payload;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired Pinterest OAuth state',
      );
    }
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.clientId()}:${this.clientSecret()}`).toString('base64')}`;
  }

  async exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<TokenResponse> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri(),
        code_verifier: codeVerifier,
      }),
    });
    if (!res.ok) throw new Error(`Pinterest token exchange HTTP ${res.status}`);
    return (await res.json()) as TokenResponse;
  }

  private async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Pinterest token refresh HTTP ${res.status}`);
    return (await res.json()) as TokenResponse;
  }

  // Best-effort - a failed lookup shouldn't fail the whole connect flow, the
  // username is display-only (shown next to "Отключить" in the profile UI).
  async fetchAccountUsername(accessToken: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/user_account`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { username?: string };
      return data.username ?? null;
    } catch {
      return null;
    }
  }

  async upsertConnection(
    userId: string,
    tokens: TokenResponse,
    pinterestUsername: string | null,
  ): Promise<PinterestConnection> {
    const existing = await this.connections.findOneBy({ userId });
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    if (existing) {
      existing.accessToken = tokens.access_token;
      if (tokens.refresh_token) existing.refreshToken = tokens.refresh_token;
      existing.expiresAt = expiresAt;
      existing.scope = tokens.scope ?? existing.scope;
      existing.pinterestUsername =
        pinterestUsername ?? existing.pinterestUsername;
      return this.connections.save(existing);
    }

    const connection = this.connections.create({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? '',
      expiresAt,
      scope: tokens.scope ?? null,
      pinterestUsername,
    });
    return this.connections.save(connection);
  }

  findByUserId(userId: string): Promise<PinterestConnection | null> {
    return this.connections.findOneBy({ userId });
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.connections.delete({ userId });
  }

  // Refreshes the access token if it's within 5 minutes of expiry, persisting
  // the new token before returning - callers always get a connection whose
  // accessToken is safe to use immediately.
  private async refreshIfNeeded(
    connection: PinterestConnection,
  ): Promise<PinterestConnection> {
    const fiveMinutes = 5 * 60 * 1000;
    if (connection.expiresAt.getTime() - Date.now() > fiveMinutes)
      return connection;

    const tokens = await this.refreshToken(connection.refreshToken);
    connection.accessToken = tokens.access_token;
    if (tokens.refresh_token) connection.refreshToken = tokens.refresh_token;
    connection.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    return this.connections.save(connection);
  }

  async fetchBoards(
    connection: PinterestConnection,
  ): Promise<PinterestBoard[]> {
    const fresh = await this.refreshIfNeeded(connection);
    const res = await fetch(`${API_BASE}/boards`, {
      headers: { Authorization: `Bearer ${fresh.accessToken}` },
    });
    if (!res.ok) throw new Error(`Pinterest boards HTTP ${res.status}`);
    // Trim down to {id, name} - Pinterest's real response includes a lot more
    // (thumbnails, collaborator/follower counts, privacy, owner, ...) than
    // this app needs on the wire, same reasoning as fetchPins's mapping below.
    const data = (await res.json()) as {
      items?: Array<{ id: string; name: string }>;
    };
    return (data.items ?? []).map((b) => ({ id: b.id, name: b.name }));
  }

  async fetchPins(
    connection: PinterestConnection,
    boardId: string,
  ): Promise<PinterestPin[]> {
    const fresh = await this.refreshIfNeeded(connection);
    const res = await fetch(`${API_BASE}/boards/${boardId}/pins`, {
      headers: { Authorization: `Bearer ${fresh.accessToken}` },
    });
    if (!res.ok) throw new Error(`Pinterest pins HTTP ${res.status}`);
    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        title?: string;
        media?: { images?: Record<string, { url: string }> };
      }>;
    };
    return (data.items ?? []).map((p) => ({
      id: p.id,
      title: p.title || 'Pinterest Pin',
      image:
        p.media?.images?.['400x300']?.url ||
        p.media?.images?.originals?.url ||
        '',
    }));
  }
}
