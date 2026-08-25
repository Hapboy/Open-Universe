import { MigrationInterface, QueryRunner } from 'typeorm';

// An entity's `params.photos` used to be a bare `string[]` of media refs. It's
// now a list of objects carrying per-photo metadata - whether the photo reaches
// prompts at all, plus what it shows:
//
//   ["s3:abc"]  ->  [{ ref: "s3:abc", include: true }]
//
// See apps/web's schemas/entities/schemaHelpers.ts (photoEntrySchema) for the
// full shape; `caption`/`role` are simply absent until someone fills them in.
// `include: true` is written explicitly rather than left implicit so every read
// stays a plain `photos.filter((p) => p.include)`.
//
// No read-time fallback for the old shape anywhere on the frontend - this
// migration is the one-time cutover, same approach as
// MoveGenerationBookkeepingToSiblingField1786204681897. Both tables carrying
// entity params need it: scene graphs (node.data.params) and saved presets
// (presets.snapshot, including the mise_en_scene rows seeded by
// SeedInitialPresets1785415928555, whose photos are static asset paths rather
// than s3: refs - they migrate identically).

interface RawNode {
  data?: {
    params?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Idempotent: a row already holding objects is left alone, so a second
// migration:run is a no-op rather than double-wrapping.
function migratePhotos(params: Record<string, unknown>): {
  params: Record<string, unknown>;
  changed: boolean;
} {
  const photos = params.photos;
  if (!Array.isArray(photos)) return { params, changed: false };
  // Array.isArray() narrows `unknown` to `any[]`; re-typing keeps the entries
  // `unknown` so nothing below silently becomes `any`.
  const entries = photos as unknown[];
  if (!entries.some((p) => typeof p === 'string'))
    return { params, changed: false };
  const migrated = entries.map((p) =>
    typeof p === 'string' ? { ref: p, include: true } : p,
  );
  return { params: { ...params, photos: migrated }, changed: true };
}

function migrateGraph(graph: unknown): { graph: unknown; changed: boolean } {
  const g = graph as { nodes?: RawNode[] } | null;
  if (!g || !Array.isArray(g.nodes)) return { graph, changed: false };
  let changed = false;
  const nodes = g.nodes.map((n) => {
    const params = n?.data?.params;
    if (!params || typeof params !== 'object') return n;
    const { params: nextParams, changed: nodeChanged } = migratePhotos(params);
    if (!nodeChanged) return n;
    changed = true;
    return { ...n, data: { ...n.data, params: nextParams } };
  });
  return { graph: changed ? { ...g, nodes } : graph, changed };
}

export class PhotoEntriesWithMetadata1786742400000 implements MigrationInterface {
  name = 'PhotoEntriesWithMetadata1786742400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sceneRows = (await queryRunner.query(
      `SELECT id, graph FROM "scenes"`,
    )) as Array<{ id: string; graph: unknown }>;
    for (const row of sceneRows) {
      const { graph, changed } = migrateGraph(row.graph);
      if (!changed) continue;
      await queryRunner.query(
        `UPDATE "scenes" SET graph = $1::jsonb WHERE id = $2`,
        [JSON.stringify(graph), row.id],
      );
    }

    const presetRows = (await queryRunner.query(
      `SELECT id, snapshot FROM "presets"`,
    )) as Array<{ id: string; snapshot: Record<string, unknown> }>;
    for (const row of presetRows) {
      if (!row.snapshot || typeof row.snapshot !== 'object') continue;
      const { params: nextSnapshot, changed } = migratePhotos(row.snapshot);
      if (!changed) continue;
      await queryRunner.query(
        `UPDATE "presets" SET snapshot = $1::jsonb WHERE id = $2`,
        [JSON.stringify(nextSnapshot), row.id],
      );
    }
  }

  // Not reversed: no frontend code reads the bare-string shape after this pass,
  // so there's nothing meaningful to roll back to (same as
  // MoveGenerationBookkeepingToSiblingField's down()).
  public async down(): Promise<void> {}
}
