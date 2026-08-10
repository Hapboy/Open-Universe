import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { NodeParams } from "@/types.ts";

// Per-scene undo/redo for the graph editor. Kept out of React state
// entirely (plain refs) — there's no toolbar UI to disable/enable off
// canUndo/canRedo (keyboard-only, Ctrl+Z/Ctrl+Shift+Z), so making this
// reactive would only add a re-render source to the highest-frequency part
// of the app (updateNodeParam fires per keystroke).

export interface GraphSnapshot {
    nodes: Node<NodeParams>[];
    edges: Edge[];
    selectedNodeId: string | null;
}

interface SceneStack {
    past: GraphSnapshot[];
    future: GraphSnapshot[];
}

interface PendingEntry {
    sceneId: string;
    key: string | null;
    baseline: GraphSnapshot;
    timer: ReturnType<typeof setTimeout> | null;
}

const HISTORY_LIMIT = 50; // per scene, oldest evicted on overflow
const BURST_IDLE_MS = 600; // idle window that collapses a keystroke/drag burst into one entry

interface UseGraphHistoryParams {
    nodes: Node<NodeParams>[];
    edges: Edge[];
    selectedNodeId: string | null;
    activeSceneId: string | null;
    setNodes: Dispatch<SetStateAction<Node<NodeParams>[]>>;
    setEdges: Dispatch<SetStateAction<Edge[]>>;
    setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
}

export interface UseGraphHistoryResult {
    // key === null: a discrete action (delete, duplicate, preset apply...) —
    // merges with other record(null) calls made in the same synchronous
    // call stack (e.g. React Flow's Delete key firing onNodesChange then
    // onEdgesChange), so they land as one undo step. key !== null: a
    // continuable burst (per-keystroke param edits, node drag) — repeated
    // calls with the same key extend a debounce window instead of each
    // creating their own step.
    record: (key: string | null) => void;
    flush: () => void;
    undo: () => void;
    redo: () => void;
    garbageCollectScene: (sceneId: string) => void;
}

export function useGraphHistory({
    nodes,
    edges,
    selectedNodeId,
    activeSceneId,
    setNodes,
    setEdges,
    setSelectedNodeId,
}: UseGraphHistoryParams): UseGraphHistoryResult {
    // Mirrors the latest committed state for synchronous reads inside
    // record()/undo()/redo() without making those callbacks depend on (and
    // get re-created every time) nodes/edges. Synced in a layout effect
    // (not during render — refs are for effects/handlers, not render
    // itself) so it's guaranteed current by the time the next
    // event-handler-triggered mutator runs; only exception is two mutators
    // called back-to-back in the same synchronous handler with no render in
    // between, where the second may see a one-step-stale baseline — a minor
    // granularity edge case, not a correctness bug (see e.g. UtilParams.tsx's
    // handleTrackChange, two updateNodeParam calls in one click handler).
    const liveRef = useRef({ nodes, edges, selectedNodeId, activeSceneId });
    useLayoutEffect(() => {
        liveRef.current = { nodes, edges, selectedNodeId, activeSceneId };
    });

    const stacksRef = useRef<Record<string, SceneStack>>({});
    const pendingRef = useRef<PendingEntry | null>(null);

    const stackFor = useCallback((sceneId: string): SceneStack => {
        let stack = stacksRef.current[sceneId];
        if (!stack) {
            stack = { past: [], future: [] };
            stacksRef.current[sceneId] = stack;
        }
        return stack;
    }, []);

    const flush = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending) return;
        pendingRef.current = null;
        if (pending.timer) clearTimeout(pending.timer);
        const stack = stackFor(pending.sceneId);
        stack.past.push(pending.baseline);
        if (stack.past.length > HISTORY_LIMIT) stack.past.shift();
        stack.future = [];
    }, [stackFor]);

    const record = useCallback(
        (key: string | null) => {
            const sceneId = liveRef.current.activeSceneId;
            if (!sceneId) return;

            const pending = pendingRef.current;
            if (pending && pending.sceneId === sceneId && pending.key === key) {
                // Continuing the same burst (or another discrete call in the
                // same batch) — baseline stays pinned to where it started.
                if (key !== null) {
                    if (pending.timer) clearTimeout(pending.timer);
                    pending.timer = setTimeout(flush, BURST_IDLE_MS);
                }
                return;
            }

            // A different key (or nothing pending) — commit whatever was
            // pending first, then start a fresh entry.
            flush();

            const baseline: GraphSnapshot = {
                nodes: liveRef.current.nodes,
                edges: liveRef.current.edges,
                selectedNodeId: liveRef.current.selectedNodeId,
            };
            if (key === null) {
                pendingRef.current = { sceneId, key: null, baseline, timer: null };
                queueMicrotask(flush);
            } else {
                pendingRef.current = {
                    sceneId,
                    key,
                    baseline,
                    timer: setTimeout(flush, BURST_IDLE_MS),
                };
            }
        },
        [flush],
    );

    // Defensive backstops: don't lose an in-flight burst to a tab switch or
    // an unmount (scene switches already flush explicitly via
    // loadSceneIntoState).
    useEffect(() => {
        window.addEventListener("blur", flush);
        return () => {
            window.removeEventListener("blur", flush);
            flush();
        };
    }, [flush]);

    const applySnapshot = useCallback(
        (s: GraphSnapshot) => {
            setNodes(s.nodes);
            setEdges(s.edges);
            setSelectedNodeId(s.selectedNodeId);
        },
        [setNodes, setEdges, setSelectedNodeId],
    );

    const undo = useCallback(() => {
        flush();
        const sceneId = liveRef.current.activeSceneId;
        if (!sceneId) return;
        const stack = stackFor(sceneId);
        const prev = stack.past.pop();
        if (!prev) return;
        stack.future.push({
            nodes: liveRef.current.nodes,
            edges: liveRef.current.edges,
            selectedNodeId: liveRef.current.selectedNodeId,
        });
        applySnapshot(prev);
    }, [flush, stackFor, applySnapshot]);

    const redo = useCallback(() => {
        flush();
        const sceneId = liveRef.current.activeSceneId;
        if (!sceneId) return;
        const stack = stackFor(sceneId);
        const next = stack.future.pop();
        if (!next) return;
        stack.past.push({
            nodes: liveRef.current.nodes,
            edges: liveRef.current.edges,
            selectedNodeId: liveRef.current.selectedNodeId,
        });
        applySnapshot(next);
    }, [flush, stackFor, applySnapshot]);

    const garbageCollectScene = useCallback((sceneId: string) => {
        delete stacksRef.current[sceneId];
    }, []);

    // Each field is independently stable across renders (record/flush/
    // undo/redo/garbageCollectScene all close only over refs and each
    // other), so memoizing the container object too means callers can
    // safely depend on `history` as a whole without losing memoization.
    return useMemo(
        () => ({ record, flush, undo, redo, garbageCollectScene }),
        [record, flush, undo, redo, garbageCollectScene],
    );
}
