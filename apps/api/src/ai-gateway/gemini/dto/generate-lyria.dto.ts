import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class GenerateLyriaDto {
  @ApiProperty({
    example: 'A melancholic duduk melody over a slow ambient pad',
  })
  @IsString()
  prompt: string;

  // See GenerateImagenDto's comment - mirrors the frontend's LyriaOptions.
  @ApiProperty({
    description: 'LyriaOptions - see apps/web/src/core/services/gemini.ts',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  options: Record<string, unknown>;
}
