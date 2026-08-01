import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UploadMediaDto {
  @ApiPropertyOptional({
    description:
      'Defaults to "uploaded" - pass "generated" for AI-generated media (AiGatewayModule).',
    enum: ['uploaded', 'generated'],
  })
  @IsIn(['uploaded', 'generated'])
  @IsOptional()
  kind?: 'uploaded' | 'generated';
}
