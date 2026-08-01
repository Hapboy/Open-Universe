import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateVeoDto {
  @ApiProperty({ example: 'A drone shot flying over the Cascade in Yerevan' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Base64-encoded reference image, or null',
  })
  @IsString()
  @IsOptional()
  imageBase64?: string | null;

  // See GenerateImagenDto's comment - mirrors the frontend's VeoOptions.
  @ApiProperty({
    description: 'VeoOptions - see apps/web/src/core/services/gemini.ts',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  options: Record<string, unknown>;
}
