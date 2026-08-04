import {
  BadGatewayException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotImplementedException,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';
import { PinterestService } from './pinterest.service';

// Pinterest is a connected third-party integration a user opts into, not an
// AI provider - a separate top-level module/route prefix from AiGatewayModule
// (see docs/backend-bootstrap.md's original placement, superseded here).
@ApiTags('pinterest')
@Controller('pinterest')
export class PinterestController {
  constructor(private readonly pinterest: PinterestService) {}

  private requireConfigured(): void {
    if (!this.pinterest.isConfigured()) {
      throw new NotImplementedException('Pinterest not configured');
    }
  }

  private static asError(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  @Get('oauth/authorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the Pinterest authorize URL to open in a popup',
  })
  authorize(@CurrentUser() user: User): { url: string } {
    this.requireConfigured();
    return { url: this.pinterest.buildAuthorizeUrl(user.id) };
  }

  // No guard - Pinterest's own redirect back to this URL carries no bearer
  // header, so the authenticated user is recovered from the signed `state`
  // instead (see PinterestService.buildAuthorizeUrl/verifyState).
  @Get('oauth/callback')
  @ApiOperation({ summary: 'Pinterest OAuth redirect target' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!code || !state) throw new Error('Missing code/state');
      const { sub: userId, codeVerifier } = this.pinterest.verifyState(state);
      const tokens = await this.pinterest.exchangeCode(code, codeVerifier);
      const username = await this.pinterest.fetchAccountUsername(
        tokens.access_token,
      );
      await this.pinterest.upsertConnection(userId, tokens, username);
      res.redirect(this.pinterest.appCallbackUrl('success'));
    } catch {
      res.redirect(this.pinterest.appCallbackUrl('error'));
    }
  }

  @Get('connection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check whether the current user has connected Pinterest',
  })
  async connection(
    @CurrentUser() user: User,
  ): Promise<{ connected: boolean; pinterestUsername?: string }> {
    const existing = await this.pinterest.findByUserId(user.id);
    if (!existing) return { connected: false };
    return {
      connected: true,
      pinterestUsername: existing.pinterestUsername ?? undefined,
    };
  }

  @Delete('connection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Disconnect Pinterest' })
  async disconnect(@CurrentUser() user: User): Promise<void> {
    await this.pinterest.removeByUserId(user.id);
  }

  @Get('boards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the connected user's Pinterest boards" })
  async boards(@CurrentUser() user: User) {
    this.requireConfigured();
    const connection = await this.pinterest.findByUserId(user.id);
    if (!connection) throw new ForbiddenException('Pinterest not connected');
    try {
      return { boards: await this.pinterest.fetchBoards(connection) };
    } catch (e) {
      throw new BadGatewayException(PinterestController.asError(e));
    }
  }

  @Get('boards/:boardId/pins')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List a board's pins" })
  async pins(@CurrentUser() user: User, @Param('boardId') boardId: string) {
    this.requireConfigured();
    const connection = await this.pinterest.findByUserId(user.id);
    if (!connection) throw new ForbiddenException('Pinterest not connected');
    try {
      return { pins: await this.pinterest.fetchPins(connection, boardId) };
    } catch (e) {
      throw new BadGatewayException(PinterestController.asError(e));
    }
  }
}
