import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AiJob } from './ai-job.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiJob]),
    BullModule.registerQueue({ name: 'ai' }),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
