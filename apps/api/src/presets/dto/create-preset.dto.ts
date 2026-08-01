import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePresetDto {
  @ApiPropertyOptional({
    description:
      'Client-minted id, for upsert. The frontend assigns a node its presetId ' +
      'at creation time (see usePresetDatabase in apps/web), before it is ever ' +
      'saved to the library - passing that same id here lets the first save ' +
      'create the row under it and every later save update it in place, ' +
      'instead of the backend minting a new id the frontend would then have ' +
      'to reconcile. Omit to let the backend generate one.',
  })
  @IsUUID()
  @IsOptional()
  id?: string;

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
