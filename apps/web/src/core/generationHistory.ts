// Pure bookkeeping shared by every node's generation history — the
// standalone Gemini nodes' node.data.generation (NodeCard.tsx,
// graphExecution.ts) and output_scene's per-stage node.data.generation.image/
// .video (UtilParams.tsx's OutputParams). No React/store concerns here:
// callers own where the resulting GenerationHistoryState gets written
// (node.data.generation directly for a standalone node,
// node.data.generation.image/.video for output_scene) and how many store
// writes that takes.
import type { GenerationHistoryState } from "@/types.ts";

export const MAX_GENERATION_HISTORY = 20; // cap per-stream generated-output history

// Appends a fresh ref (+ optional params snapshot) onto a history stream,
// capping its length and dropping paramsHistory entries that fall off the
// cap. `paramsSnapshot` is omitted when there's no "what produced this" to
// record (e.g. output_scene's media-library pick, which isn't a
// generation) — the ref still gets appended, it just has nothing to restore
// later.
export function appendGenerationHistory(
    current: Partial<GenerationHistoryState> | undefined,
    ref: string,
    paramsSnapshot?: Record<string, unknown>,
): GenerationHistoryState {
    const prevHistory = current?.history ?? [];
    const history = [...prevHistory, ref];
    const paramsHistory = { ...(current?.paramsHistory ?? {}) };
    if (paramsSnapshot) paramsHistory[ref] = paramsSnapshot;
    const overflow = history.length - MAX_GENERATION_HISTORY;
    if (overflow > 0) {
        const dropped = history.splice(0, overflow);
        for (const droppedRef of dropped) delete paramsHistory[droppedRef];
    }
    return { history, idx: history.length - 1, paramsHistory };
}

// Removes one entry, clamping idx back into range and dropping its
// paramsHistory snapshot.
export function removeFromGenerationHistory(
    current: GenerationHistoryState,
    i: number,
): GenerationHistoryState {
    const ref = current.history[i];
    const history = current.history.filter((_, idx) => idx !== i);
    const paramsHistory = { ...current.paramsHistory };
    if (ref) delete paramsHistory[ref];
    return {
        history,
        paramsHistory,
        idx: Math.max(0, Math.min(current.idx, history.length - 1)),
    };
}

// Which ref a history stream is currently parked on — the value used
// everywhere downstream (reference image, scene output, wired-field display
// fallback, ...).
export function currentHistoryRef(
    current: Partial<GenerationHistoryState> | undefined,
): string | undefined {
    const history = current?.history ?? [];
    const idx = current?.idx ?? history.length - 1;
    return history[idx];
}

// `idx` clamped into the valid range for the current history length — safe
// to feed straight to MediaSlider/HistoryNav's `index` prop.
export function clampHistoryIdx(current: Partial<GenerationHistoryState> | undefined): number {
    const history = current?.history ?? [];
    return Math.max(0, Math.min(current?.idx ?? history.length - 1, history.length - 1));
}

// Scrubbing to index `i`: the new idx plus whichever params snapshot was
// recorded for that ref (undefined if it predates paramsHistory tracking, or
// came from a media-library pick). Callers restore the snapshot themselves —
// how many store writes that takes differs per caller (see this module's
// doc comment above).
export function historyIndexChange(
    current: GenerationHistoryState,
    i: number,
): { idx: number; snapshot: Record<string, unknown> | undefined } {
    return { idx: i, snapshot: current.paramsHistory[current.history[i]] };
}
