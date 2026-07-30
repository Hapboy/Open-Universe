import { MigrationInterface, QueryRunner } from 'typeorm';

// v1 seed data: only the entity types the user confirmed as ready to move
// off the frontend-only ENTITY_PRESET_SEEDS fixture (apps/web/src/data/presets.ts)
// - character, location, mise_en_scene. The other entity types there
// (building, clothing, artwork, furniture, music, script, storyboard,
// transport) stay frontend-only fixtures until their turn comes.
//
// `presetId` is deliberately dropped from each snapshot here: that field
// was the frontend's own hardcoded slug (e.g. "char-ara-geghetsik") used as
// both the library lookup key and a node-level identity fingerprint. Now
// that presets have a real backend-generated `id`, the row's own id is the
// library key - the frontend cutover (not yet done, see docs/frontend-todo.md)
// will need to start writing that id back onto `params.presetId` when a
// node is linked to a saved preset, rather than continuing to hardcode it.
export class SeedInitialPresets1785415928555 implements MigrationInterface {
  name = 'SeedInitialPresets1785415928555';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{
      entityType: string;
      name: string;
      snapshot: Record<string, unknown>;
    }> = [
      {
        entityType: 'character',
        name: 'Ара Гехецик',
        snapshot: {
          inFrame: true,
          age: 34,
          emotion: 'спокойствие',
          stylist: 'Без стилиста',
          photos: [],
          photoIdx: 0,
        },
      },
      {
        entityType: 'character',
        name: 'Анаит Багратуни',
        snapshot: {
          inFrame: true,
          age: 34,
          emotion: 'спокойствие',
          stylist: 'Без стилиста',
          photos: [],
          photoIdx: 0,
        },
      },
      {
        entityType: 'character',
        name: 'Вардан Майриг',
        snapshot: {
          inFrame: true,
          age: 34,
          emotion: 'спокойствие',
          stylist: 'Без стилиста',
          photos: [],
          photoIdx: 0,
        },
      },
      {
        entityType: 'character',
        name: 'Цовинар',
        snapshot: {
          inFrame: true,
          age: 34,
          emotion: 'спокойствие',
          stylist: 'Без стилиста',
          photos: [],
          photoIdx: 0,
        },
      },
      {
        entityType: 'location',
        name: 'Старый Конд',
        snapshot: {
          weather: 'туман',
          timeOfDay: 'рассвет',
          interiorExterior: 'Экстерьер',
          damageLevel: 0,
        },
      },
      {
        entityType: 'location',
        name: 'Каскад',
        snapshot: {
          weather: 'туман',
          timeOfDay: 'рассвет',
          interiorExterior: 'Экстерьер',
          damageLevel: 0,
        },
      },
      {
        entityType: 'location',
        name: 'Гарни',
        snapshot: {
          weather: 'туман',
          timeOfDay: 'рассвет',
          interiorExterior: 'Экстерьер',
          damageLevel: 0,
        },
      },
      {
        entityType: 'location',
        name: 'Севан',
        snapshot: {
          weather: 'туман',
          timeOfDay: 'рассвет',
          interiorExterior: 'Экстерьер',
          damageLevel: 0,
        },
      },
      {
        entityType: 'mise_en_scene',
        name: '1 человек в кадре',
        snapshot: { photos: [], photoIdx: 0, peopleCount: 1, cameraCount: 1 },
      },
      {
        entityType: 'mise_en_scene',
        name: '2 человека в кадре',
        snapshot: {
          photos: ['/assets/mise-en-scene/2p_1cam_ots-render.jpg'],
          photoIdx: 0,
          peopleCount: 2,
          cameraCount: 1,
        },
      },
      {
        entityType: 'mise_en_scene',
        name: '3 человека в кадре',
        snapshot: {
          photos: ['/assets/mise-en-scene/3p_3cam_overhead-triangle.jpg'],
          photoIdx: 0,
          peopleCount: 3,
          cameraCount: 3,
        },
      },
      {
        entityType: 'mise_en_scene',
        name: '3+ человек в кадре',
        snapshot: {
          photos: ['/assets/mise-en-scene/6p_1cam_render-medium.jpg'],
          photoIdx: 0,
          peopleCount: 6,
          cameraCount: 1,
        },
      },
    ];

    for (const row of rows) {
      await queryRunner.query(
        `INSERT INTO "presets" ("entity_type", "name", "snapshot") VALUES ($1, $2, $3::jsonb)`,
        [row.entityType, row.name, JSON.stringify(row.snapshot)],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "presets" WHERE "entity_type" IN ('character', 'location', 'mise_en_scene')`,
    );
  }
}
