import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject, IsString } from 'class-validator';

export class GenerateNanoBananaDto {
  @ApiProperty({ example: 'Put this character into a snowy Dilijan street' })
  @IsString()
  prompt: string;

  @ApiProperty({
    type: [String],
    description: 'Base64-encoded reference images',
  })
  @IsArray()
  @IsString({ each: true })
  imageBase64List: string[];

  // See GenerateImagenDto's comment - mirrors the frontend's NanoBananaOptions.
  @ApiProperty({
    description: 'NanoBananaOptions - see apps/web/src/core/services/gemini.ts',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  options: Record<string, unknown>;
}
