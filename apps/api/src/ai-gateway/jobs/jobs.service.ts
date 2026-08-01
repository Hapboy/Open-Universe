import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { AiJob } from './ai-job.entity';

interface EnqueueParams {
  ownerId?: string | null;
  provider: string;
  kind: string;
  // BullMQ job name - the processor switches on this to decide which
  // provider service method to call.
  jobName: string;
  data: Record<string, unknown>;
}

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(AiJob)
    private readonly aiJobs: Repository<AiJob>,
    @InjectQueue('ai')
    private readonly queue: Queue,
  ) {}

  // Creates the row first so the caller has a real id to hand back to the
  // client immediately, then enqueues the actual work - the processor reads
  // the row back by aiJobId rather than trusting the queue payload alone.
  async enqueue({
    ownerId,
    provider,
    kind,
    jobName,
    data,
  }: EnqueueParams): Promise<AiJob> {
    const job = this.aiJobs.create({
      ownerId: ownerId ?? null,
      provider,
      kind,
      status: 'queued',
    });
    const saved = await this.aiJobs.save(job);
    await this.queue.add(jobName, { ...data, aiJobId: saved.id });
    return saved;
  }

  async findOne(id: string): Promise<AiJob> {
    const job = await this.aiJobs.findOneBy({ id });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async markInProgress(id: string): Promise<void> {
    const job = await this.findOne(id);
    job.status = 'in_progress';
    await this.aiJobs.save(job);
  }

  async markCompleted(
    id: string,
    result: Record<string, unknown>,
  ): Promise<void> {
    const job = await this.findOne(id);
    job.status = 'completed';
    job.result = result;
    await this.aiJobs.save(job);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const job = await this.findOne(id);
    job.status = 'failed';
    job.error = error;
    await this.aiJobs.save(job);
  }
}
