import { useEffect, useRef } from "react";
import { writeJSON } from "@/core/browserStorage.ts";

const DEFAULT_DELAY_MS = 400;

// Shared debounced-localStorage-save pattern (was independently duplicated in
// GraphContext and PresetLibraryContext). Takes a value-factory + explicit
// deps array (like useEffect/useCallback) rather than a single reactive
// value, so a caller can omit a piece of its own state from the deps list
// when including it would re-arm the timer on every save that state causes
// (see GraphContext's scene-graph autosave for why that matters).
export function useDebouncedPersist<T>(
    key: string,
    computeValue: () => T,
    deps: React.DependencyList,
    opts?: {
        delayMs?: number;
        onError?: (error: unknown) => void;
        // Called with the persisted value after the write — for callers that
        // also need to sync the computed value back into React state (e.g.
        // GraphContext's sceneGraphs), not just write it to localStorage.
        onPersist?: (value: T) => void;
        // Skip arming the timer entirely while false (e.g. no active scene
        // yet) — checked here rather than by the caller conditionally
        // calling the hook, which React's rules of hooks disallow.
        enabled?: boolean;
    },
): void {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const delayMs = opts?.delayMs ?? DEFAULT_DELAY_MS;
    const enabled = opts?.enabled ?? true;

    useEffect(() => {
        if (!enabled) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            const value = computeValue();
            writeJSON(key, value, opts?.onError);
            opts?.onPersist?.(value);
        }, delayMs);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
