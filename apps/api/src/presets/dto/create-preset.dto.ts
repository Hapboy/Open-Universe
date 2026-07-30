import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePresetDto {
  @ApiProperty({ example: 'character' })
  @IsString()
  entityType: string;

  @ApiProperty({ example: 'Ара Гехецик' })
  @IsString()
  name: string;

  // Deliberately untyped beyond "is an object" - same tradeoff as
  // CreateSceneDto.graph: this is a verbatim copy of the frontend's
  // still-evolving per-entity-type param shape, not a schema this API
  // should own or validate deeply. See data/presets.ts.
  @ApiProperty({
    description:
      'Verbatim frontend node params for this entity type - see data/presets.ts',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  snapshot: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Nullable until AuthModule/UsersModule exist - no owner is assigned yet',
  })
  @IsUUID()
  @IsOptional()
  ownerId?: string;
}
