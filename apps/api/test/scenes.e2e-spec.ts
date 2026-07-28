import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface SceneResponse {
  id: string;
  ownerId: string | null;
  title: string;
  graph: { nodes: unknown[]; edges: unknown[] };
}

describe('ScenesController (e2e)', () => {
  let app: INestApplication<App>;
  let createdId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /scenes creates a scene, defaulting graph when omitted', async () => {
    const res = await request(app.getHttpServer())
      .post('/scenes')
      .send({ title: 'e2e test scene' })
      .expect(201);
    const body = res.body as SceneResponse;

    expect(body).toMatchObject({
      title: 'e2e test scene',
      ownerId: null,
      graph: { nodes: [], edges: [] },
    });
    expect(body.id).toEqual(expect.any(String));
    createdId = body.id;
  });

  it('GET /scenes/:id returns the created scene', async () => {
    const res = await request(app.getHttpServer())
      .get(`/scenes/${createdId}`)
      .expect(200);
    const body = res.body as SceneResponse;
    expect(body.id).toBe(createdId);
  });

  it('GET /scenes includes the created scene', async () => {
    const res = await request(app.getHttpServer()).get('/scenes').expect(200);
    const body = res.body as SceneResponse[];
    expect(body.some((s) => s.id === createdId)).toBe(true);
  });

  it('PATCH /scenes/:id saves the graph', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/scenes/${createdId}`)
      .send({ graph: { nodes: [{ id: 'n1' }], edges: [] } })
      .expect(200);
    const body = res.body as SceneResponse;
    expect(body.graph.nodes).toHaveLength(1);
  });

  it('GET /scenes/:id 404s for a nonexistent id', async () => {
    await request(app.getHttpServer())
      .get('/scenes/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('DELETE /scenes/:id removes it, then GET 404s', async () => {
    await request(app.getHttpServer())
      .delete(`/scenes/${createdId}`)
      .expect(200);
    await request(app.getHttpServer()).get(`/scenes/${createdId}`).expect(404);
  });
});
