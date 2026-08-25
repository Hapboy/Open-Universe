import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotImplementedException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeminiService } from './gemini.service';
import { JobsService } from '../jobs/jobs.service';
import { GenerateTextDto } from './dto/generate-text.dto';
import { GenerateVisionDto } from './dto/generate-vision.dto';
import { GenerateImagenDto } from './dto/generate-imagen.dto';
import { GenerateVeoDto } from './dto/generate-veo.dto';
import { GenerateNanoBananaDto } from './dto/generate-nano-banana.dto';
import { GenerateLyriaDto } from './dto/generate-lyria.dto';
import type {
  ImagenOptions,
  LyriaOptions,
  NanoBananaOptions,
} from './gemini.service';

// Mirrors apps/web/app/api/gemini/*/route.ts's 501 (not configured) / 502
// (provider call failed) semantics exactly - see docs/backend-bootstrap.md
// Phase G.5. Veo is the one job-queued route (see JobsModule); every other
// route is a direct, synchronous relay.
@ApiTags('ai-gemini')
@Controller('ai/gemini')
export class GeminiController {
  constructor(
    private readonly gemini: GeminiService,
    private readonly jobsService: JobsService,
    private readonly config: ConfigService,
  ) {}

  private requireKey(): string {
    const key = this.config.get<string>('GEMINI_KEY');
    if (!key) throw new NotImplementedException('Gemini not configured');
    return key;
  }

  private static asError(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  @Get('models')
  @ApiOperation({ summary: 'List Gemini models supporting generateContent' })
  async models() {
    const key = this.requireKey();
    try {
      const models = await this.gemini.listModels(key);
      return { models };
    } catch (e) {
      throw new BadGatewayException(GeminiController.asError(e));
    }
  }

  @Post('text')
  @ApiOperation({ summary: 'Generate text' })
  async text(@Body() dto: GenerateTextDto) {
    const key = this.requireKey();
    try {
      const text = await this.gemini.runText(dto.prompt, key, dto.model);
      return { text };
    } catch (e) {
      throw new BadGatewayException(GeminiController.asError(e));
    }
  }

  @Post('vision')
  @ApiOperation({ summary: 'Describe/answer a question about an image' })
  async vision(@Body() dto: GenerateVisionDto) {
    const key = this.requireKey();
    try {
      const text = await this.gemini.runVision(
        dto.imageBase64,
        dto.query,
        key,
        dto.model,
      );
      return { text };
    } catch (e) {
      throw new BadGatewayException(GeminiController.asError(e));
    }
  }

  @Post('imagen')
  @ApiOperation({ summary: 'Generate an image (Imagen 4)' })
  async imagen(@Body() dto: GenerateImagenDto) {
    const key = this.requireKey();
    try {
      // ok:false (RAI safety filter) is a normal result, not an error - same
      // as the route it replaces, always 200.
      return await this.gemini.runImagen(
        dto.prompt,
        dto.options as unknown as ImagenOptions,
        key,
      );
    } catch (e) {
      throw new BadGatewayException(GeminiController.asError(e));
    }
  }

  @Post('nano-banana')
  @ApiOperation({
    summary: 'Generate an image from reference images (Nano Banana)',
  })
  // `dataUrl` (the first image) is kept alongside the full `dataUrls` list on
  // purpose: apps/web auto-deploys on push to main while apps/api ships by a
  // manual `railway up`, so both shapes have to be valid while only one side
  // has rolled out. The frontend client reads `dataUrls ?? [dataUrl]`.
  async nanoBanana(@Body() dto: GenerateNanoBananaDto) {
    const key = this.requireKey();
    try {
      const dataUrls = await this.gemini.runNanoBanana(
        dto.prompt,
        dto.imageBase64List,
        dto.options as unknown as NanoBananaOptions,
        key,
      );
      return { dataUrl: dataUrls[0], dataUrls };
    } catch (e) {
      throw new BadGatewayException(GeminiController.asError(e));
    }
  }

  @Post('lyria')
  @ApiOperation({ summary: 'Generate music (Lyria)' })
  async lyria(@Body() dto: GenerateLyriaDto) {
    const key = this.requireKey();
    try {
      const dataUrl = await this.gemini.runLyria(
        dto.prompt,
        dto.options as unknown as LyriaOptions,
        key,
      );
      return { dataUrl };
    } catch (e) {
      throw new BadGatewayException(GeminiController.asError(e));
    }
  }

  @Post('veo')
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Generate a video (Veo) - queued, poll GET /ai/jobs/:id for the result',
  })
  async veo(@Body() dto: GenerateVeoDto) {
    this.requireKey(); // validate configured now; the worker reads its own key when it runs
    const job = await this.jobsService.enqueue({
      provider: 'gemini',
      kind: 'veo',
      jobName: 'gemini.veo',
      data: {
        prompt: dto.prompt,
        imageBase64: dto.imageBase64 ?? null,
        options: dto.options,
      },
    });
    return { jobId: job.id };
  }
}
