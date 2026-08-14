import { useResolvedMediaUrls } from "@/core/mediaRef.ts";
import {
    appendGenerationHistory,
    clampHistoryIdx,
    currentHistoryRef,
    historyIndexChange,
    removeFromGenerationHistory,
} from "@/core/generationHistory.ts";
import type { GenerationHistoryState } from "@/types.ts";

// React-side wiring over core/generationHistory.ts's pure bookkeeping:
// resolves each ref to a real URL, clamps idx, and binds
// onIndexChange/onDelete/append to whatever store write the caller supplies
// via `onChange` — NodeCard.tsx for the standalone Gemini nodes' single flat
// node.data.generation, UtilParams.tsx's OutputParams for output_scene's two
// independent streams (node.data.generation.image/.video, one hook call
// each). Neither caller hand-duplicates the resolve/clamp/handler-building
// logic anymore, just supplies where the result gets written.
//
// `onRestoreSnapshot`, called with a scrubbed-to entry's recorded params
// snapshot (if any — see core/generationHistory.ts's historyIndexChange),
// performs whatever *separate* store write that snapshot needs (e.g.
// updateNodeParams into the sibling `params` field) and may return an extra
// patch to fold into this same onChange call — output_scene needs this for
// `lastComposedPrompt`, which lives alongside idx in `generation`; merging
// it into the one onChange call (rather than a second, separate one) avoids
// a stale-closure race between two writes to the same generation object
// within a single handler.
//
// `T` lets output_scene's stages carry `lastComposedPrompt` alongside the
// shared history fields (see types.ts's `generation` doc comment) — defaults
// to plain GenerationHistoryState for the standalone nodes' flat shape.
export function useGenerationHistory<T extends GenerationHistoryState = GenerationHistoryState>(
    generation: Partial<T> | undefined,
    onChange: (patch: Partial<T>) => void,
    onRestoreSnapshot?: (snapshot: Record<string, unknown>) => Partial<T> | void,
) {
    const history = generation?.history ?? [];
    const idx = clampHistoryIdx(generation);
    const resolvedUrls = useResolvedMediaUrls(history);
    const currentRef = currentHistoryRef(generation);

    const onIndexChange = (i: number) => {
        const full: GenerationHistoryState = {
            history,
            idx,
            paramsHistory: generation?.paramsHistory ?? {},
        };
        const { idx: nextIdx, snapshot } = historyIndexChange(full, i);
        const extra = snapshot ? onRestoreSnapshot?.(snapshot) : undefined;
        onChange({ idx: nextIdx, ...extra } as Partial<T>);
    };

    const onDelete = (i: number) => {
        const full: GenerationHistoryState = {
            history,
            idx,
            paramsHistory: generation?.paramsHistory ?? {},
        };
        onChange(removeFromGenerationHistory(full, i) as Partial<T>);
    };

    const append = (ref: string, paramsSnapshot?: Record<string, unknown>) => {
        onChange(appendGenerationHistory(generation, ref, paramsSnapshot) as Partial<T>);
    };

    return { history, idx, resolvedUrls, currentRef, onIndexChange, onDelete, append };
}
