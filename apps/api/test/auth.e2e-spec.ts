import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface AuthUserResponse {
  id: string;
  username: string;
  firstName: string;
  lastName: string | null;
  role: string;
}

interface AuthResponseBody {
  user: AuthUserResponse;
  token: string;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  // Unique per run so repeated runs against the shared dev DB never collide.
  const username = `e2e_auth_${Date.now()}`;

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
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users WHERE username = $1', [username]);
    await app.close();
  });

  it('POST /auth/signup creates an account and returns a token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username, password: 'password123', firstName: 'Тест' })
      .expect(201);
    const body = res.body as AuthResponseBody;

    expect(body.user).toMatchObject({
      username,
      firstName: 'Тест',
      lastName: null,
      role: 'Режиссер',
    });
    expect(body.token).toEqual(expect.any(String));
  });

  it('POST /auth/signup rejects a duplicate username', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username, password: 'password123', firstName: 'Тест' })
      .expect(409);
  });

  it('POST /auth/signup rejects a too-short password', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: `${username}_short`,
        password: 'short',
        firstName: 'Тест',
      })
      .expect(400);
  });

  it('POST /auth/login rejects a wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password: 'wrong-password' })
      .expect(401);
  });

  it('POST /auth/login rejects an unknown username', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `${username}_missing`, password: 'password123' })
      .expect(401);
  });

  it('POST /auth/login succeeds with the right credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password: 'password123' })
      .expect(200);
    const body = res.body as AuthResponseBody;

    expect(body.user.username).toBe(username);
    expect(body.token).toEqual(expect.any(String));
  });

  it('GET /auth/me 401s without a token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me 401s with a garbage token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('GET /auth/me returns the authenticated user with a valid token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password: 'password123' })
      .expect(200);
    const { token } = loginRes.body as AuthResponseBody;

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = res.body as { user: AuthUserResponse };

    expect(body.user.username).toBe(username);
  });

  it('POST /auth/logout is a stateless no-op', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(204);
  });
});
