import { MigrationInterface, QueryRunner } from 'typeorm';

// Companion to apps/web's frontend-todo.md "Move generation bookkeeping out
// of params into a sibling field" — generatedHistory/generatedIdx/
// generatedParamsHistory/lastGeneratedRef used to live inside a history node
// (gemini_text/vision/imagen/veo/nanobanana/lyria)'s own node.data.params,
// kept apart from real generation inputs only by a denylist filter
// (graphExecution.ts's GENERATION_BOOKKEEPING_KEYS, now deleted). Moved to a
// sibling node.data.generation: { history, idx, paramsHistory } so `params`
// is only ever user-facing generation inputs. No read-time fallback for the
// old shape — this migration is the one-time cutover instead; any row this
// doesn't touch (scenes created after this ran) never had the old shape.
const GENERATION_KEYS = [
  'generatedHistory',
  'generatedIdx',
  'generatedParamsHistory',
  'lastGeneratedRef',
] as const;

interface RawNode {
  data?: {
    params?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function migrateNode(node: RawNode): { node: RawNode; changed: boolean } {
  const params = node?.data?.params;
  if (!params || typeof params !== 'object') return { node, changed: false };
  if (!GENERATION_KEYS.some((k) => k in params))
    return { node, changed: false };

  const history: string[] = Array.isArray(params.generatedHistory)
    ? (params.generatedHistory as string[])
    : params.lastGeneratedRef
      ? [params.lastGeneratedRef as string]
      : [];
  const idx =
    typeof params.generatedIdx === 'number'
      ? params.generatedIdx
      : history.length - 1;
  const paramsHistory =
    (params.generatedParamsHistory as Record<
      string,
      Record<string, unknown>
    >) ?? {};

  const nextParams = { ...params };
  for (const k of GENERATION_KEYS) delete nextParams[k];

  return {
    changed: true,
    node: {
      ...node,
      data: {
        ...node.data,
        params: nextParams,
        generation: { history, idx: Math.max(0, idx), paramsHistory },
      },
    },
  };
}

function migrateGraph(graph: unknown): { graph: unknown; changed: boolean } {
  const g = graph as { nodes?: RawNode[] } | null;
  if (!g || !Array.isArray(g.nodes)) return { graph, changed: false };
  let changed = false;
  const nodes = g.nodes.map((n) => {
    const result = migrateNode(n);
    if (result.changed) changed = true;
    return result.node;
  });
  return { graph: changed ? { ...g, nodes } : graph, changed };
}

export class MoveGenerationBookkeepingToSiblingField1786204681897 implements MigrationInterface {
  name = 'MoveGenerationBookkeepingToSiblingField1786204681897';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT id, graph FROM "scenes"`,
    )) as Array<{
      id: string;
      graph: unknown;
    }>;
    for (const row of rows) {
      const { graph, changed } = migrateGraph(row.graph);
      if (!changed) continue;
      await queryRunner.query(
        `UPDATE "scenes" SET graph = $1::jsonb WHERE id = $2`,
        [JSON.stringify(graph), row.id],
      );
    }
  }

  // Not reversed: the old params-nested shape is being retired outright (no
  // frontend code reads it anymore after this pass), so there's nothing
  // meaningful to roll back to.
  public async down(): Promise<void> {}
}
