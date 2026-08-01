import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateTextDto {
  @ApiProperty({ example: 'Write a haiku about Yerevan' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ example: 'gemini-flash-latest' })
  @IsString()
  @IsOptional()
  model?: string;
}
