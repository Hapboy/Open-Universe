import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PinterestService } from '../src/pinterest/pinterest.service';

interface AuthResponseBody {
  user: { id: string };
  token: string;
}

// Whether PINTEREST_CLIENT_ID/SECRET/REDIRECT_URI are filled into whichever
// .env.local this suite runs against varies by developer machine (soft-fail
// 501 when unset, same posture as GEMINI_KEY) - the configured-vs-not branch
// below asserts against PinterestService's *actual* isConfigured() state
// (read from the running app's DI container, not re-derived from
// process.env here - ConfigModule only populates process.env once AppModule
// is instantiated in beforeAll, after this file's top-level code runs)
// instead of assuming one, so this suite passes whether or not real
// developers.pinterest.com credentials are present. Exchanging a real code or
// listing a real user's boards needs a live Pinterest consent flow - out of
// scope for an automated e2e test, same reason no gemini/higgsfield e2e spec
// exists either.
describe('PinterestController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  let userId: string;
  let configured: boolean;
  const username = `e2e_pinterest_${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
    configured = app.get(PinterestService).isConfigured();

    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username, password: 'password123', firstName: 'Тест' })
      .expect(201);
    const body = res.body as AuthResponseBody;
    token = body.token;
    userId = body.user.id;
  });

  afterAll(async () => {
    await dataSource.query(
      'DELETE FROM pinterest_connections WHERE user_id = $1',
      [userId],
    );
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await app.close();
  });

  it('GET /pinterest/connection 401s without a token', async () => {
    await request(app.getHttpServer()).get('/pinterest/connection').expect(401);
  });

  it('GET /pinterest/connection reports disconnected when no row exists', async () => {
    const res = await request(app.getHttpServer())
      .get('/pinterest/connection')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({ connected: false });
  });

  it('DELETE /pinterest/connection is a no-op (204) when nothing is connected', async () => {
    await request(app.getHttpServer())
      .delete('/pinterest/connection')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });

  it('GET /pinterest/connection reports connected once a row exists', async () => {
    await dataSource.query(
      `INSERT INTO pinterest_connections (user_id, access_token, refresh_token, expires_at, pinterest_username)
       VALUES ($1, 'fake-access', 'fake-refresh', now() + interval '1 hour', 'aram_on_pinterest')`,
      [userId],
    );

    const res = await request(app.getHttpServer())
      .get('/pinterest/connection')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({
      connected: true,
      pinterestUsername: 'aram_on_pinterest',
    });
  });

  it('DELETE /pinterest/connection removes an existing row', async () => {
    await request(app.getHttpServer())
      .delete('/pinterest/connection')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/pinterest/connection')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({ connected: false });
  });

  it('GET /pinterest/oauth/authorize 401s without a token', async () => {
    await request(app.getHttpServer())
      .get('/pinterest/oauth/authorize')
      .expect(401);
  });

  it('GET /pinterest/oauth/authorize 501s when Pinterest is not configured, otherwise returns a real Pinterest URL', async () => {
    const res = await request(app.getHttpServer())
      .get('/pinterest/oauth/authorize')
      .set('Authorization', `Bearer ${token}`)
      .expect(configured ? 200 : 501);
    if (configured) {
      expect((res.body as { url: string }).url).toMatch(
        /^https:\/\/www\.pinterest\.com\/oauth\/\?/,
      );
    }
  });

  it('GET /pinterest/boards 401s without a token', async () => {
    await request(app.getHttpServer()).get('/pinterest/boards').expect(401);
  });

  it('GET /pinterest/boards 501s when Pinterest is not configured, 403s (not connected) otherwise', async () => {
    await request(app.getHttpServer())
      .get('/pinterest/boards')
      .set('Authorization', `Bearer ${token}`)
      .expect(configured ? 403 : 501);
  });

  it('GET /pinterest/boards/:boardId/pins 501s when Pinterest is not configured, 403s (not connected) otherwise', async () => {
    await request(app.getHttpServer())
      .get('/pinterest/boards/some-board/pins')
      .set('Authorization', `Bearer ${token}`)
      .expect(configured ? 403 : 501);
  });

  it('GET /pinterest/oauth/callback redirects with status=error on a missing code/state', async () => {
    const res = await request(app.getHttpServer())
      .get('/pinterest/oauth/callback')
      .expect(302);
    expect(res.headers.location).toContain('status=error');
  });
});
