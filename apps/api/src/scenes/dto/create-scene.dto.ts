import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSceneDto {
  @ApiProperty({ example: 'Сцена 1' })
  @IsString()
  title: string;

  // Deliberately untyped beyond "is an object" - this is a verbatim copy of
  // the frontend's still-evolving in-memory scene graph shape (nodes/edges),
  // not a schema this API should own or validate deeply. See GraphContext.tsx.
  @ApiPropertyOptional({
    description:
      'Verbatim frontend scene graph shape ({ nodes, edges }) - see GraphContext.tsx',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  graph?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Nullable until AuthModule/UsersModule exist - no owner is assigned yet',
  })
  @IsUUID()
  @IsOptional()
  ownerId?: string;
}
