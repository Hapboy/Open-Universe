import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { AiJob } from './ai-job.entity';

@ApiTags('ai-jobs')
@Controller('ai/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Poll an async AI job (e.g. Veo) by id' })
  findOne(@Param('id') id: string): Promise<AiJob> {
    return this.jobsService.findOne(id);
  }
}
