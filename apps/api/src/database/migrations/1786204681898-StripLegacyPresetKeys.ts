import { MigrationInterface, QueryRunner } from 'typeorm';

// Companion to apps/web's frontend-todo.md "clean up shared.tsx's
// BOOKKEEPING_KEYS legacy fields (_presets, photoIdx)". `_presets` is a
// stray leftover key from graphs saved before presets became a shared
// library (PresetLibraryContext.tsx); `photoIdx` is a dead field name from
// before FixPresetPhotoIdxKey1785575290163 (which already fixed `presets`.
// `snapshot` rows, but not scene graphs, since node params were still a
// second, separate copy of the same data at the time). Confirmed still live
// 2026-08-08: a real character node still carried `"photoIdx": 3`. This is
// the one-time cleanup that makes the client-side strip in shared.tsx's
// BOOKKEEPING_KEYS (now just `["selectedItem"]`) safe to drop for these two.
const LEGACY_KEYS = ['_presets', 'photoIdx'] as const;

interface RawNode {
  data?: {
    params?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function stripLegacyKeys(obj: Record<string, unknown>): {
  obj: Record<string, unknown>;
  changed: boolean;
} {
  if (!LEGACY_KEYS.some((k) => k in obj)) return { obj, changed: false };
  const next = { ...obj };
  for (const k of LEGACY_KEYS) delete next[k];
  return { obj: next, changed: true };
}

function migrateGraph(graph: unknown): { graph: unknown; changed: boolean } {
  const g = graph as { nodes?: RawNode[] } | null;
  if (!g || !Array.isArray(g.nodes)) return { graph, changed: false };
  let changed = false;
  const nodes = g.nodes.map((n) => {
    const params = n?.data?.params;
    if (!params || typeof params !== 'object') return n;
    const { obj: nextParams, changed: nodeChanged } = stripLegacyKeys(params);
    if (!nodeChanged) return n;
    changed = true;
    return { ...n, data: { ...n.data, params: nextParams } };
  });
  return { graph: changed ? { ...g, nodes } : graph, changed };
}

export class StripLegacyPresetKeys1786204681898 implements MigrationInterface {
  name = 'StripLegacyPresetKeys1786204681898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sceneRows = (await queryRunner.query(
      `SELECT id, graph FROM "scenes"`,
    )) as Array<{
      id: string;
      graph: unknown;
    }>;
    for (const row of sceneRows) {
      const { graph, changed } = migrateGraph(row.graph);
      if (!changed) continue;
      await queryRunner.query(
        `UPDATE "scenes" SET graph = $1::jsonb WHERE id = $2`,
        [JSON.stringify(graph), row.id],
      );
    }

    // presets.snapshot's `photoIdx` was already renamed to `coverPhotoIndex`
    // by FixPresetPhotoIdxKey1785575290163 — this only ever needs to catch a
    // stray `_presets`, but stripping both here too is a harmless no-op
    // safety net if either ever resurfaces.
    const presetRows = (await queryRunner.query(
      `SELECT id, snapshot FROM "presets"`,
    )) as Array<{
      id: string;
      snapshot: Record<string, unknown>;
    }>;
    for (const row of presetRows) {
      const { obj: nextSnapshot, changed } = stripLegacyKeys(row.snapshot);
      if (!changed) continue;
      await queryRunner.query(
        `UPDATE "presets" SET snapshot = $1::jsonb WHERE id = $2`,
        [JSON.stringify(nextSnapshot), row.id],
      );
    }
  }

  // Not reversed — these keys were always dead data (see
  // FixPresetPhotoIdxKey1785575290163's down() for the same reasoning), so
  // there's nothing legitimate to restore.
  public async down(): Promise<void> {}
}
