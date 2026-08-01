import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateVisionDto {
  @ApiProperty({ description: 'Base64-encoded image bytes (no data: prefix)' })
  @IsString()
  imageBase64: string;

  @ApiProperty({ example: 'Describe this scene' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ example: 'gemini-flash-latest' })
  @IsString()
  @IsOptional()
  model?: string;
}
