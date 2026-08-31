import type { Node } from "@xyflow/react";
import type { NodeType } from "@hayverse/shared";
import type { NodeParams } from "@/types.ts";

// The only two Gemini providers whose seed param is actually forwarded to
// the real API — Imagen/Veo's seed fields are Vertex-Enterprise-only and
// never sent (see core/api/gemini/client.ts's doc comment / apps/api's
// ImagenOptions/VeoOptions, which omit `seed` entirely). Seeding those two
// here would be pointless — their field stays disabled and unused.
export const SEED_CAPABLE_NODE_TYPES: ReadonlySet<NodeType> = new Set([
    "gemini_nanobanana",
    "gemini_lyria",
]);

export function generateSeed(): number {
    return Math.floor(Math.random() * 2 ** 31);
}

// The Gemini Developer API never echoes back which seed it randomly picked
// when the field is left empty (checked @google/genai's
// GenerateContentResponse type directly — no seed anywhere in that response
// shape, request-only). Leaving it unset would make the actual seed
// unrecoverable after the fact, so every generation resolves and persists a
// concrete seed instead — the field always shows the real value that
// produced the current result, and a "reroll" (seed + 10000, see MediaSlider/
// HistoryNav's onReroll) always has a real previous value to bump from.
//
// `randomizeSeed` (SeedField's "Случайный" toggle, default true/missing)
// controls whether a *plain* generate (no explicit override) reuses the
// stored seed or always mints a fresh one — before reroll existed, the seed
// was always server-picked, so plain Generate produced a different photo
// every click; once a concrete seed started getting persisted, that
// stopped being true unless the toggle is on. Explicit overrides (reroll's
// own seed+10000) are merged in by the caller after this patch, so they
// always win regardless of the toggle — see withNodeOverrides below.
function resolvedSeedPatch(params: Record<string, unknown>): Record<string, unknown> | null {
    const current = params.seed;
    if (params.randomizeSeed === false) {
        if (current !== "" && current != null) return null;
        return { seed: String(generateSeed()) };
    }
    return { seed: String(generateSeed()) };
}

// Ensures every seed-capable node with an empty seed gets a freshly-minted
// one, in one pass — used before a whole-graph run so nothing it's about to
// execute reads an empty seed. Returns the same array reference when
// nothing needed patching, so callers can skip a setNodes call.
export function withEnsuredSeeds(nodes: Node<NodeParams>[]): Node<NodeParams>[] {
    let changed = false;
    const next = nodes.map((n) => {
        if (!SEED_CAPABLE_NODE_TYPES.has(n.data.nodeType)) return n;
        const patch = resolvedSeedPatch(n.data.params);
        if (!patch) return n;
        changed = true;
        return { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } };
    });
    return changed ? next : nodes;
}

// Ensures one node's seed (if seed-capable) and applies any extra param
// overrides (e.g. a reroll button bumping seed by 10000) in a single write —
// used right before runNode's cascade so the value it executes with is
// exactly the value that ends up persisted, with no stale-closure gap
// between "write to state" and "read state back" (React state updates are
// async; a plain updateNodeParam followed immediately by runNode would
// still see the old value). Returns the same array reference when nothing
// needed patching.
export function withNodeOverrides(
    nodes: Node<NodeParams>[],
    nodeId: string,
    overrides?: Record<string, unknown>,
): Node<NodeParams>[] {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return nodes;
    const seedPatch = SEED_CAPABLE_NODE_TYPES.has(target.data.nodeType)
        ? resolvedSeedPatch({ ...target.data.params, ...overrides })
        : null;
    const patch = { ...(seedPatch ?? {}), ...(overrides ?? {}) };
    if (Object.keys(patch).length === 0) return nodes;
    return nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } } : n,
    );
}
