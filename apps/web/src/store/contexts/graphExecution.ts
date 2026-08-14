import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { NodeType } from "@hayverse/shared";
import type { GenerationHistoryState, NodeParams, NodeRef } from "@/types.ts";
import type { SceneOutput } from "@/core/graph.ts";
import { putGeneratedBlob } from "@/core/mediaRef.ts";
import { edgeInput } from "@/core/graph.ts";
import { appendGenerationHistory } from "@/core/generationHistory.ts";

type ShowToast = (msg: string) => void;

// Which of the 6 HISTORY_NODE_TYPES (data/nodes.ts) need a blob upload
// (image/video/audio, via mediaRef.ts's putGeneratedBlob) vs which can just
// store their output string directly as the history "ref" (plain generated
// text — small enough to keep inline, no R2 round-trip needed).
const HISTORY_OUTPUT_KIND: Partial<Record<NodeType, "blob" | "text">> = {
    gemini_imagen: "blob",
    gemini_nanobanana: "blob",
    gemini_veo: "blob",
    gemini_lyria: "blob",
    gemini_text: "text",
    gemini_vision: "text",
};

// Each history node type's "prompt-like" wirable field: which param key it
// writes to and which input pin index feeds it (see core/graph.ts's
// computeNodeOutput) — mostly `prompt`/pin 0, except gemini_vision's field
// is `query`/pin 1 (pin 0 is its image input).
const WIRABLE_FIELD: Partial<Record<NodeType, { paramKey: string; pinIndex: number }>> = {
    gemini_text: { paramKey: "prompt", pinIndex: 0 },
    gemini_vision: { paramKey: "query", pinIndex: 1 },
    gemini_imagen: { paramKey: "prompt", pinIndex: 0 },
    gemini_veo: { paramKey: "prompt", pinIndex: 0 },
    gemini_nanobanana: { paramKey: "prompt", pinIndex: 0 },
    gemini_lyria: { paramKey: "prompt", pinIndex: 0 },
};

interface UseGraphExecutionParams {
    nodes: Node<NodeParams>[];
    edges: Edge[];
    setNodes: Dispatch<SetStateAction<Node<NodeParams>[]>>;
    activeSceneId: string | null;
    showToast: ShowToast;
    // From UserContext's pinterestStatus - see pinterestApiClient.fetchBoards.
    pinterestConnected: boolean;
}

interface UseGraphExecutionResult {
    resolved: Record<string, unknown>;
    sceneOutputs: Record<string, SceneOutput>;
    runningNodeIds: Set<string>;
    executeGraph: () => Promise<void>;
    runNode: (nodeId: string, paramOverrides?: Record<string, unknown>) => Promise<void>;
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

    // Caches a fresh generation result (R2-backed for blob kinds, inline for
    // text) and appends its ref onto the node's `data.generation.history`
    // (shown by NodeCard as a nav-able slider/history bar, and as a fallback
    // for when `resolved` is empty, e.g. right after page load, before the
    // node has been re-run this session). `resolved` itself keeps holding
    // the raw value untouched — other nodes/edges consuming it (e.g. wiring
    // this output into another Gemini call, or into output_scene's Visual
    // Render pin) still get a directly usable value. `persistedOutputRef`
    // dedups against repeated "Прогнать граф" clicks: a node whose output
    // didn't change since the last persist is skipped.
    const persistedOutputRef = useRef<Map<string, string>>(new Map());
    const appendGeneratedRef = useCallback(
        (nodeId: string, ref: string, paramsSnapshot: Record<string, unknown>) => {
            setNodes((ns) =>
                ns.map((n) => {
                    if (n.id !== nodeId) return n;
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            generation: appendGenerationHistory(
                                n.data.generation as GenerationHistoryState | undefined,
                                ref,
                                paramsSnapshot,
                            ),
                        },
                    };
                }),
            );
        },
        [setNodes],
    );
    const persistGeneratedOutputs = useCallback(
        (currentNodes: Node<NodeParams>[], resolvedMap: Record<string, unknown>) => {
            for (const node of currentNodes) {
                const kind = HISTORY_OUTPUT_KIND[node.data.nodeType];
                if (!kind) continue;
                const outputId = node.data.outputs[0]?.id;
                const value = outputId ? resolvedMap[outputId] : undefined;
                if (kind === "blob" && (typeof value !== "string" || !value.startsWith("data:")))
                    continue;
                if (kind === "text" && (typeof value !== "string" || value === "")) continue;
                if (persistedOutputRef.current.get(node.id) === value) continue;
                persistedOutputRef.current.set(node.id, value as string);
                // No filtering needed here — generation bookkeeping lives in
                // node.data.generation now, never in node.data.params, so
                // every key here is a real, user-facing generation input.
                const paramsSnapshot = { ...node.data.params };
                // When the prompt/query pin is wired, the text actually sent
                // to the API is the live resolved edge value (see graph.ts),
                // never written into node.data.params — capture it here so
                // scrubbing the history back to this generation later shows
                // what was actually used, not whatever the upstream node
                // currently says.
                const field = WIRABLE_FIELD[node.data.nodeType];
                if (field) {
                    const fieldInput = edgeInput(node.data, edges, resolvedMap, field.pinIndex);
                    if (fieldInput.wired) paramsSnapshot[field.paramKey] = fieldInput.value;
                }
                if (kind === "text") {
                    appendGeneratedRef(node.id, value as string, paramsSnapshot);
                    continue;
                }
                fetch(value as string)
                    .then((r) => r.blob())
                    .then(putGeneratedBlob)
                    .then((ref) => appendGeneratedRef(node.id, ref, paramsSnapshot))
                    .catch(console.error);
            }
        },
        [appendGeneratedRef, edges],
    );

    const executeGraph = useCallback(async () => {
        const { runGraph } = await import("@/core/graph.ts");
        const { withEnsuredSeeds } = await import("@/core/seed.ts");
        const sceneId = activeSceneId;
        const seededNodes = withEnsuredSeeds(nodes);
        if (seededNodes !== nodes) setNodes(seededNodes);
        resolvedRef.current = {};
        const output = await runGraph(seededNodes, edges, resolvedRef.current, showToast);
        setResolved({ ...resolvedRef.current });
        persistGeneratedOutputs(seededNodes, resolvedRef.current);
        cacheSceneOutput(sceneId, output);
    }, [
        nodes,
        edges,
        showToast,
        activeSceneId,
        cacheSceneOutput,
        persistGeneratedOutputs,
        setNodes,
    ]);

    // `paramOverrides` lets a caller (e.g. a seed field's reroll button)
    // atomically patch this node's params right before it runs — see
    // core/seed.ts's withNodeOverrides doc comment for why this can't just
    // be a separate updateNodeParam call followed by runNode(nodeId).
    const runNode = useCallback(
        async (nodeId: string, paramOverrides?: Record<string, unknown>) => {
            const { runNodeCascade } = await import("@/core/graph.ts");
            const { withNodeOverrides } = await import("@/core/seed.ts");
            const sceneId = activeSceneId;
            const runNodes = withNodeOverrides(nodes, nodeId, paramOverrides);
            if (runNodes !== nodes) setNodes(runNodes);
            const output = await runNodeCascade(
                nodeId,
                runNodes,
                edges,
                resolvedRef.current,
                showToast,
                (id) => setRunningNodeIds((s) => new Set(s).add(id)),
                (id) => {
                    setRunningNodeIds((s) => {
                        const next = new Set(s);
                        next.delete(id);
                        return next;
                    });
                    setResolved({ ...resolvedRef.current });
                    persistGeneratedOutputs(runNodes, resolvedRef.current);
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
            persistGeneratedOutputs,
            setNodes,
        ],
    );

    // Reactively keeps free/non-AI nodes (Pinterest pin, text passthrough,
    // entity selectors, ...) resolved without a manual "Прогнать граф" click
    // — debounced so rapid edits don't thrash. AI-model nodes are skipped
    // entirely (see runGraph's autoMode) and only ever resolve from an
    // explicit manual action (the Topbar button or a node's own ▶ button).
    const autoResolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (autoResolveTimer.current) clearTimeout(autoResolveTimer.current);
        autoResolveTimer.current = setTimeout(() => {
            void (async () => {
                const { runGraph } = await import("@/core/graph.ts");
                const sceneId = activeSceneId;
                const output = await runGraph(nodes, edges, resolvedRef.current, showToast, {
                    autoMode: true,
                });
                setResolved({ ...resolvedRef.current });
                cacheSceneOutput(sceneId, output);
            })();
        }, 250);
        return () => {
            if (autoResolveTimer.current) clearTimeout(autoResolveTimer.current);
        };
    }, [nodes, edges, activeSceneId, showToast, cacheSceneOutput]);

    const loadPinterestBoards = useCallback(
        async (node: NodeRef) => {
            const { pinterestApiClient } = await import("@/core/api/index.ts");
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
            const { pinterestApiClient } = await import("@/core/api/index.ts");
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
