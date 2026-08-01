import { Module } from '@nestjs/common';
import { JobsModule } from './jobs/jobs.module';
import { GeminiModule } from './gemini/gemini.module';
import { AiGatewayProcessor } from './ai-gateway.processor';

@Module({
  imports: [JobsModule, GeminiModule],
  providers: [AiGatewayProcessor],
})
export class AiGatewayModule {}
