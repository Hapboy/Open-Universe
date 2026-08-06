import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { R2_CLIENT } from '../src/media/r2-client.provider';

interface MediaResponse {
  id: string;
  ownerId: string | null;
  kind: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: string;
  url: string;
}

interface AuthResponseBody {
  token: string;
}

// The R2 client is mocked here rather than hitting real Cloudflare storage -
// keeps the suite fast/repeatable and avoids leaving test uploads in the
// actual bucket on every run. The DB (media_assets + users) is still real.
describe('MediaController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let createdId: string;
  const mockR2Send = jest.fn().mockResolvedValue({});

  // Unique per run so repeated runs against the shared dev DB never collide.
  const username1 = `e2e_media_${Date.now()}_1`;
  const username2 = `e2e_media_${Date.now()}_2`;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(R2_CLIENT)
      .useValue({ send: mockR2Send })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);

    const signup1 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: username1, password: 'password123', firstName: 'U1' })
      .expect(201);
    token1 = (signup1.body as AuthResponseBody).token;

    const signup2 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: username2, password: 'password123', firstName: 'U2' })
      .expect(201);
    token2 = (signup2.body as AuthResponseBody).token;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users WHERE username IN ($1, $2)', [
      username1,
      username2,
    ]);
    await app.close();
  });

  it('POST /media 401s without a token', async () => {
    await request(app.getHttpServer())
      .post('/media')
      .attach('file', Buffer.from('fake image bytes'), {
        filename: 'test.png',
        contentType: 'image/png',
      })
      .expect(401);
  });

  it('GET /media 401s without a token', async () => {
    await request(app.getHttpServer()).get('/media').expect(401);
  });

  it('POST /media uploads a file via the mocked R2 client, owned by the caller', async () => {
    const fileContents = Buffer.from('fake image bytes');

    const res = await request(app.getHttpServer())
      .post('/media')
      .set('Authorization', `Bearer ${token1}`)
      .attach('file', fileContents, {
        filename: 'test.png',
        contentType: 'image/png',
      })
      .expect(201);
    const body = res.body as MediaResponse;

    expect(mockR2Send).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      kind: 'uploaded',
      mimeType: 'image/png',
      sizeBytes: String(fileContents.byteLength),
    });
    expect(body.ownerId).toEqual(expect.any(String));
    expect(body.storageKey).toMatch(/^s3:/);
    expect(body.url).toContain(body.storageKey);
    createdId = body.id;
  });

  it('GET /media/:id returns the created asset to its owner', async () => {
    const res = await request(app.getHttpServer())
      .get(`/media/${createdId}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    const body = res.body as MediaResponse;
    expect(body.id).toBe(createdId);
  });

  it('GET /media includes the created asset for its owner', async () => {
    const res = await request(app.getHttpServer())
      .get('/media')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    const body = res.body as MediaResponse[];
    expect(body.some((m) => m.id === createdId)).toBe(true);
  });

  it('GET /media/:id 404s for a nonexistent id', async () => {
    await request(app.getHttpServer())
      .get('/media/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token1}`)
      .expect(404);
  });

  it("GET /media does not include another user's asset", async () => {
    const res = await request(app.getHttpServer())
      .get('/media')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);
    const body = res.body as MediaResponse[];
    expect(body.some((m) => m.id === createdId)).toBe(false);
  });

  it("GET /media/:id 404s (not 403) for another user's asset", async () => {
    await request(app.getHttpServer())
      .get(`/media/${createdId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404);
  });

  it("DELETE /media/:id 404s (not 403) for another user's asset, and the asset survives", async () => {
    await request(app.getHttpServer())
      .delete(`/media/${createdId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/media/${createdId}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
  });

  it('DELETE /media/:id removes it (from R2 via the mock, and the DB) for its owner, then GET 404s', async () => {
    await request(app.getHttpServer())
      .delete(`/media/${createdId}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(mockR2Send).toHaveBeenCalledTimes(2);
    await request(app.getHttpServer())
      .get(`/media/${createdId}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(404);
  });
});
