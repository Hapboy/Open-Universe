import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'aram_dev' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  username: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Арам' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName: string;

  @ApiPropertyOptional({ example: 'Петросян' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  lastName?: string;
}
