import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class GenerateImagenDto {
  @ApiProperty({ example: 'A duduk player at sunset over Yerevan' })
  @IsString()
  prompt: string;

  // Deliberately untyped beyond "is an object" - same tradeoff as
  // CreatePresetDto.snapshot: this mirrors the frontend's ImagenOptions
  // shape (see core/services/gemini.ts), which tracks the @google/genai
  // SDK's own config surface, not a schema this API should own.
  @ApiProperty({
    description: 'ImagenOptions - see apps/web/src/core/services/gemini.ts',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  options: Record<string, unknown>;
}
