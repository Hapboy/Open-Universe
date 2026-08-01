import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { GeminiService } from './gemini/gemini.service';
import type { VeoOptions } from './gemini/gemini.service';
import { JobsService } from './jobs/jobs.service';

interface GeminiVeoJobData {
  aiJobId: string;
  prompt: string;
  imageBase64: string | null;
  options: VeoOptions;
}

// The single BullMQ worker for the whole ai-gateway - one queue ('ai'), one
// processor, job.name picks the branch. Cheap to extend with
// 'higgsfield.soul'/'higgsfield.motion' later if that provider ever moves
// here too, rather than running a separate worker per provider.
@Injectable()
@Processor('ai')
export class AiGatewayProcessor extends WorkerHost {
  private readonly logger = new Logger(AiGatewayProcessor.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly jobsService: JobsService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'gemini.veo':
        return this.processGeminiVeo(job.data as GeminiVeoJobData);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async processGeminiVeo(data: GeminiVeoJobData): Promise<void> {
    const { aiJobId, prompt, imageBase64, options } = data;
    await this.jobsService.markInProgress(aiJobId);
    try {
      const key = this.config.get<string>('GEMINI_KEY');
      if (!key) throw new Error('Gemini not configured');
      const dataUrl = await this.gemini.runVeo(
        prompt,
        imageBase64,
        options,
        key,
      );
      await this.jobsService.markCompleted(aiJobId, { dataUrl });
    } catch (e) {
      await this.jobsService.markFailed(
        aiJobId,
        e instanceof Error ? e.message : String(e),
      );
    }
  }
}
