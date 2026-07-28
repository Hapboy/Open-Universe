import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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

// The R2 client is mocked here rather than hitting real Cloudflare storage -
// keeps the suite fast/repeatable and avoids leaving test uploads in the
// actual bucket on every run. The DB (media_assets) is still real.
describe('MediaController (e2e)', () => {
  let app: INestApplication<App>;
  let createdId: string;
  const mockR2Send = jest.fn().mockResolvedValue({});

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /media uploads a file via the mocked R2 client', async () => {
    const fileContents = Buffer.from('fake image bytes');

    const res = await request(app.getHttpServer())
      .post('/media')
      .attach('file', fileContents, {
        filename: 'test.png',
        contentType: 'image/png',
      })
      .expect(201);
    const body = res.body as MediaResponse;

    expect(mockR2Send).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      ownerId: null,
      kind: 'uploaded',
      mimeType: 'image/png',
      sizeBytes: String(fileContents.byteLength),
    });
    expect(body.storageKey).toMatch(/^s3:/);
    expect(body.url).toContain(body.storageKey);
    createdId = body.id;
  });

  it('GET /media/:id returns the created asset', async () => {
    const res = await request(app.getHttpServer())
      .get(`/media/${createdId}`)
      .expect(200);
    const body = res.body as MediaResponse;
    expect(body.id).toBe(createdId);
  });

  it('GET /media includes the created asset', async () => {
    const res = await request(app.getHttpServer()).get('/media').expect(200);
    const body = res.body as MediaResponse[];
    expect(body.some((m) => m.id === createdId)).toBe(true);
  });

  it('GET /media/:id 404s for a nonexistent id', async () => {
    await request(app.getHttpServer())
      .get('/media/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('DELETE /media/:id removes it (from R2 via the mock, and the DB), then GET 404s', async () => {
    await request(app.getHttpServer())
      .delete(`/media/${createdId}`)
      .expect(200);
    expect(mockR2Send).toHaveBeenCalledTimes(2);
    await request(app.getHttpServer()).get(`/media/${createdId}`).expect(404);
  });
});
