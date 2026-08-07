import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { NodeParams, NodeRef } from "../../types.ts";
import type { SceneOutput } from "../../core/graph.ts";
import type { SceneNarrativeSettings } from "./NarrativeContext.tsx";
import { putGeneratedBlob } from "../../core/mediaRef.ts";
import { edgeInput } from "../../core/graph.ts";

type ShowToast = (msg: string) => void;

const MAX_GENERATED_HISTORY = 20; // cap per-node generated-image history

// Runtime bookkeeping keys on gemini_imagen/gemini_nanobanana params — never
// part of the "params that produced this image" snapshot, since they're
// written by the history mechanism itself, not by the user.
const GENERATION_BOOKKEEPING_KEYS = new Set([
    "generatedHistory",
    "generatedIdx",
    "generatedParamsHistory",
    "lastGeneratedRef",
]);

function snapshotGenerationParams(params: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(params).filter(([key]) => !GENERATION_BOOKKEEPING_KEYS.has(key)),
    );
}

interface UseGraphExecutionParams {
    nodes: Node<NodeParams>[];
    edges: Edge[];
    setNodes: Dispatch<SetStateAction<Node<NodeParams>[]>>;
    activeSceneId: string | null;
    showToast: ShowToast;
    narrativeSettings: Record<string, SceneNarrativeSettings>;
    getSceneNarrativeSettings: (sceneId: string) => SceneNarrativeSettings;
    // From UserContext's pinterestStatus - see pinterestApiClient.fetchBoards.
    pinterestConnected: boolean;
}

interface UseGraphExecutionResult {
    resolved: Record<string, unknown>;
    sceneOutputs: Record<string, SceneOutput>;
    runningNodeIds: Set<string>;
    executeGraph: () => Promise<void>;
    runNode: (nodeId: string) => Promise<void>;
    loadPinterestBoards: (node: NodeRef) => Promise<void>;
    loadPinterestPins: (node: NodeRef, boardId: string) => Promise<void>;
}

// Owns graph-execution/service-orchestration state that used to be
// interleaved into GraphContext directly: the resolved-output cache,
// generated-image persistence/history, and Pinterest board/pin loading. Kept
// as a plain hook (not its own Context/Provider) so GraphContext's public
// `useGraphContext()` shape and AppProviders' nesting order stay unchanged —
// this is a pure extraction, not a new state boundary.
export function useGraphExecution({
    nodes,
    edges,
    setNodes,
    activeSceneId,
    showToast,
    narrativeSettings,
    getSceneNarrativeSettings,
    pinterestConnected,
}: UseGraphExecutionParams): UseGraphExecutionResult {
    const resolvedRef = useRef<Record<string, unknown>>({});
    const [resolved, setResolved] = useState<Record<string, unknown>>({});
    const [runningNodeIds, setRunningNodeIds] = useState<Set<string>>(new Set());
    const [sceneOutputs, setSceneOutputs] = useState<Record<string, SceneOutput>>({});

    const cacheSceneOutput = useCallback((sceneId: string | null, output: SceneOutput | null) => {
        if (!sceneId) return;
        setSceneOutputs((prev) => {
            if (!output) {
                if (!(sceneId in prev)) return prev;
                const next = { ...prev };
                delete next[sceneId];
                return next;
            }
            return { ...prev, [sceneId]: output };
        });
    }, []);

    // Caches a fresh Imagen/Nano Banana result to IndexedDB and appends its
    // ref onto the node's `generatedHistory` (shown by NodeCard as a photo
    // slider, and as a fallback for when `resolved` is empty, e.g. right
    // after page load, before the node has been re-run this session).
    // `resolved` itself keeps holding the raw data: URL untouched — other
    // nodes/edges consuming it (e.g. wiring this output into another Gemini
    // call, or into output_scene's Visual Render pin) still get a directly
    // usable value. `persistedImageRef` dedups against repeated "Прогнать
    // граф" clicks: a node whose output didn't change since the last persist
    // is skipped.
    const persistedImageRef = useRef<Map<string, string>>(new Map());
    const appendGeneratedRef = useCallback(
        (nodeId: string, ref: string, paramsSnapshot: Record<string, unknown>) => {
            setNodes((ns) =>
                ns.map((n) => {
                    if (n.id !== nodeId) return n;
                    const prevHistory = Array.isArray(n.data.params.generatedHistory)
                        ? (n.data.params.generatedHistory as string[])
                        : n.data.params.lastGeneratedRef
                          ? [n.data.params.lastGeneratedRef as string]
                          : [];
                    const history = [...prevHistory, ref];
                    const prevParamsHistory = (n.data.params.generatedParamsHistory ??
                        {}) as Record<string, Record<string, unknown>>;
                    const paramsHistory = { ...prevParamsHistory, [ref]: paramsSnapshot };
                    const overflow = history.length - MAX_GENERATED_HISTORY;
                    if (overflow > 0) {
                        const dropped = history.splice(0, overflow);
                        for (const droppedRef of dropped) delete paramsHistory[droppedRef];
                    }
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            params: {
                                ...n.data.params,
                                generatedHistory: history,
                                generatedIdx: history.length - 1,
                                generatedParamsHistory: paramsHistory,
                            },
                        },
                    };
                }),
            );
        },
        [setNodes],
    );
    const persistGeneratedImages = useCallback(
        (currentNodes: Node<NodeParams>[], resolvedMap: Record<string, unknown>) => {
            for (const node of currentNodes) {
                if (
                    node.data.nodeType !== "gemini_imagen" &&
                    node.data.nodeType !== "gemini_nanobanana"
                )
                    continue;
                const outputId = node.data.outputs[0]?.id;
                const value = outputId ? resolvedMap[outputId] : undefined;
                if (typeof value !== "string" || !value.startsWith("data:image")) continue;
                if (persistedImageRef.current.get(node.id) === value) continue;
                persistedImageRef.current.set(node.id, value);
                const paramsSnapshot = snapshotGenerationParams(node.data.params);
                // When the prompt pin is wired, the text actually sent to the
                // API is the live resolved edge value (see graph.ts), never
                // written into node.data.params — capture it here so scrubbing
                // the MediaSlider back to this generation later shows what was
                // actually used, not whatever the upstream node currently says.
                const promptInput = edgeInput(node.data, edges, resolvedMap, 0);
                if (promptInput.wired) paramsSnapshot.prompt = promptInput.value;
                fetch(value)
                    .then((r) => r.blob())
                    .then(putGeneratedBlob)
                    .then((ref) => appendGeneratedRef(node.id, ref, paramsSnapshot))
                    .catch(console.error);
            }
        },
        [appendGeneratedRef, edges],
    );

    const executeGraph = useCallback(async () => {
        const { runGraph } = await import("../../core/graph.ts");
        const sceneId = activeSceneId;
        resolvedRef.current = {};
        const output = await runGraph(nodes, edges, resolvedRef.current, showToast, {
            narrativeSettings: sceneId ? getSceneNarrativeSettings(sceneId) : undefined,
        });
        setResolved({ ...resolvedRef.current });
        persistGeneratedImages(nodes, resolvedRef.current);
        cacheSceneOutput(sceneId, output);
    }, [
        nodes,
        edges,
        showToast,
        activeSceneId,
        cacheSceneOutput,
        persistGeneratedImages,
        getSceneNarrativeSettings,
    ]);

    const runNode = useCallback(
        async (nodeId: string) => {
            const { runNodeCascade } = await import("../../core/graph.ts");
            const sceneId = activeSceneId;
            const output = await runNodeCascade(
                nodeId,
                nodes,
                edges,
                resolvedRef.current,
                showToast,
                sceneId ? getSceneNarrativeSettings(sceneId) : undefined,
                (id) => setRunningNodeIds((s) => new Set(s).add(id)),
                (id) => {
                    setRunningNodeIds((s) => {
                        const next = new Set(s);
                        next.delete(id);
                        return next;
                    });
                    setResolved({ ...resolvedRef.current });
                    persistGeneratedImages(nodes, resolvedRef.current);
                },
            );
            cacheSceneOutput(sceneId, output);
        },
        [
            nodes,
            edges,
            showToast,
            activeSceneId,
            cacheSceneOutput,
            persistGeneratedImages,
            getSceneNarrativeSettings,
        ],
    );

    // Reactively keeps free/non-AI nodes (Pinterest pin, text passthrough,
    // entity selectors, output_scene's Arc JSON, ...) resolved without a
    // manual "Прогнать граф" click — debounced so rapid edits don't thrash.
    // AI-model nodes are skipped entirely (see runGraph's autoMode) and only
    // ever resolve from an explicit manual action (the Topbar button or a
    // node's own ▶ button).
    const autoResolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (autoResolveTimer.current) clearTimeout(autoResolveTimer.current);
        autoResolveTimer.current = setTimeout(() => {
            void (async () => {
                const { runGraph } = await import("../../core/graph.ts");
                const sceneId = activeSceneId;
                const output = await runGraph(nodes, edges, resolvedRef.current, showToast, {
                    autoMode: true,
                    narrativeSettings: sceneId ? getSceneNarrativeSettings(sceneId) : undefined,
                });
                setResolved({ ...resolvedRef.current });
                cacheSceneOutput(sceneId, output);
            })();
        }, 250);
        return () => {
            if (autoResolveTimer.current) clearTimeout(autoResolveTimer.current);
        };
    }, [
        nodes,
        edges,
        activeSceneId,
        showToast,
        cacheSceneOutput,
        narrativeSettings,
        getSceneNarrativeSettings,
    ]);

    const loadPinterestBoards = useCallback(
        async (node: NodeRef) => {
            const { pinterestApiClient } = await import("../../core/api/index.ts");
            const boards = await pinterestApiClient.fetchBoards(showToast, pinterestConnected);
            setNodes((ns) =>
                ns.map((n) => {
                    if (n.id !== node.id) return n;
                    const params: Record<string, unknown> = { ...n.data.params, boards };
                    if (boards.length && !params.boardId) {
                        params.boardId = (boards[0] as { id: string }).id;
                        params.boardName = (boards[0] as { name: string }).name;
                    }
                    return { ...n, data: { ...n.data, params } };
                }),
            );
        },
        [showToast, setNodes, pinterestConnected],
    );

    const loadPinterestPins = useCallback(
        async (node: NodeRef, boardId: string) => {
            const { pinterestApiClient } = await import("../../core/api/index.ts");
            const pins = await pinterestApiClient.fetchPins({ boardId });
            const selectedPin = pins.length
                ? (pins[0] as { image: string }).image
                : node.data.params.selectedPin;
            setNodes((ns) =>
                ns.map((n) =>
                    n.id !== node.id
                        ? n
                        : {
                              ...n,
                              data: { ...n.data, params: { ...n.data.params, pins, selectedPin } },
                          },
                ),
            );
        },
        [setNodes],
    );

    return {
        resolved,
        sceneOutputs,
        runningNodeIds,
        executeGraph,
        runNode,
        loadPinterestBoards,
        loadPinterestPins,
    };
}
