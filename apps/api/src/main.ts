import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

// apps/web's origins allowed to call this API from a browser. Bearer-token
// auth (see DECISIONS.md), not cookies, so no credentials flag needed.
// Preview-branch Vercel URLs aren't covered here yet (see
// docs/backend-bootstrap.md's appendix) - add CORS_ORIGINS (comma-separated)
// to extend this without a code change once that's needed.
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:4174',
  'https://open-universe.vercel.app',
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Express defaults to a 100kb body limit, too small for base64-inlined
  // reference images (e.g. veo's keyframe upload).
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin:
      process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ??
      DEFAULT_CORS_ORIGINS,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Open Universe API')
    .setDescription(
      'Also importable into Postman as an OpenAPI collection from /api-json',
    )
    .setVersion('0.1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 4175, '0.0.0.0');
}
void bootstrap();
