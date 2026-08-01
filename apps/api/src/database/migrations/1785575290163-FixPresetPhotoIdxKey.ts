import { MigrationInterface, QueryRunner } from 'typeorm';

// SeedInitialPresets1785415928555 wrote each character/mise_en_scene row's
// cover-photo index under the key `photoIdx`, but every other read/write
// path in the frontend (NODE_TEMPLATES in apps/web/src/data/nodes.ts,
// usePresetDatabase in shared.tsx) uses `coverPhotoIndex`. `photoIdx` was
// therefore always dead data - and worse, not inert: once a node selects one
// of these presets, usePresetDatabase's onSelect spreads the whole snapshot
// (photoIdx included) onto the node's params, and the next save writes it
// straight back, so the stray key was propagating forward instead of
// disappearing. This renames photoIdx -> coverPhotoIndex on every affected
// row, preserving its value (falling back to any coverPhotoIndex the row
// already has, in case a save has since set one correctly).
export class FixPresetPhotoIdxKey1785575290163 implements MigrationInterface {
  name = 'FixPresetPhotoIdxKey1785575290163';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "presets"
      SET "snapshot" = ("snapshot" - 'photoIdx') || jsonb_build_object(
        'coverPhotoIndex',
        COALESCE("snapshot"->'coverPhotoIndex', "snapshot"->'photoIdx', '0'::jsonb)
      )
      WHERE "snapshot" ? 'photoIdx'
    `);
  }

  // Not reversed: by the time this would ever run, real usage may already
  // have set a legitimate coverPhotoIndex on some of these rows via a normal
  // save, and there is no way to tell that apart from a value this
  // migration itself produced. Reverting would risk clobbering real data
  // for no benefit - photoIdx was never correct to begin with.
  public async down(): Promise<void> {}
}
