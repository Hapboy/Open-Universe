import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    type Connection,
    type Edge,
    type EdgeChange,
    type IsValidConnection,
    type Node,
    type NodeChange,
    type OnConnect,
    type OnEdgesChange,
    type OnNodesChange,
} from "@xyflow/react";
import { ENTITY_NODE_TYPES, NODE_TEMPLATES, type NodeTemplate } from "@/data/nodes.ts";
import { ENTITY_PARAM_DEFAULTS } from "@/schemas/entities/schemas.ts";
import { GEMINI_PARAM_DEFAULTS } from "@/schemas/gemini/schemas.ts";
import type { NodeParams, NodeRef, Port, TimelineScene } from "@/types.ts";
import type { NodeType } from "@hayverse/shared";
import type { SceneOutput } from "@/core/graph.ts";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";
import { useUserContext } from "@/store/contexts/UserContext.tsx";
import { readJSON, readRaw, removeKey, writeRaw } from "@/core/browserStorage.ts";
import { buildPhotoPorts } from "@/core/characterPorts.ts";
import { hayverseApiClient } from "@/core/api/hayverse/client.ts";
import { useGraphExecution } from "@/store/contexts/graphExecution.ts";
import { useGraphHistory } from "@/store/contexts/graphHistory.ts";

const SCENE_GRAPHS_KEY = "hv_scene_graphs";
const ACTIVE_SCENE_KEY = "hv_active_scene_id";
const TIMELINE_DURATION_KEY = "hv_timeline_duration";
const DEFAULT_TOTAL_DURATION = 60; // 01:00 in seconds
const MAX_REFERENCE_IMAGES = 14; // Nano Banana's own API limit
const MAX_TEXT_INPUTS = 8; // text_prompt's own dynamic-field cap
const MAX_ENTITY_PHOTOS = 10;
const MAX_ENTITY_INPUTS = 20; // output_scene's own dynamic entity-pin cap, across all kinds
// Pure view-state data flags (setNodeField) — no content/semantic meaning,
// so they're excluded from undo history (see graphHistory.ts usage below).
const UI_ONLY_FIELD_KEYS = new Set<keyof NodeParams>([
    "showJsonPreview",
    "pinLabelsWide",
    "promptPanelOpen",
    "outputSceneStage",
]);

function withPhotoOutputs(nodeId: string, outputs: Port[], photos: string[]): Port[] {
    const photoPrefix = `${nodeId}_photo_`;
    const fixedOutputs = outputs.filter((p) => !p.id.startsWith(photoPrefix));
    return [...fixedOutputs, ...buildPhotoPorts(nodeId, photos)];
}

export type SceneGraphs = Record<string, { nodes: Node<NodeParams>[]; edges: Edge[] }>;

function loadStoredTotalDuration(): number {
    const raw = readRaw(TIMELINE_DURATION_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOTAL_DURATION;
}

// A stored scene graph is corrupted if any edge points at a node id that no
// longer exists in that same scene's node list.
function isValidSceneGraphs(value: unknown): value is SceneGraphs {
    if (!value || typeof value !== "object") return false;
    for (const key of Object.keys(value as Record<string, unknown>)) {
        const graph = (value as Record<string, { nodes?: unknown; edges?: unknown }>)[key];
        if (graph?.nodes && graph?.edges) {
            const nodeIds = new Set(
                (graph.nodes as { id?: string }[]).map((n) => n?.id).filter(Boolean),
            );
            for (const edge of graph.edges as { source?: string; target?: string }[]) {
                if (!edge || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return false;
            }
        }
    }
    return true;
}

function loadStoredSceneGraphs(): SceneGraphs {
    return readJSON(SCENE_GRAPHS_KEY, {} as SceneGraphs, isValidSceneGraphs, () =>
        removeKey(SCENE_GRAPHS_KEY),
    );
}

// Params from the node template, deep-cloned, with overrides on top. Entity
// types (character/location/... — see EntityParams/schemas.ts) and the 6
// Gemini types (gemini_text/.../lyria — see schemas/gemini/schemas.ts)
// source their defaults from their zod schema's own defaults object instead
// of NODE_TEMPLATES, which no longer carries a `params` key for either group.
function templateParams(type: string, overrides: Record<string, unknown> = {}) {
    const schemaDefaults =
        ENTITY_PARAM_DEFAULTS[type as NodeType] ?? GEMINI_PARAM_DEFAULTS[type as NodeType];
    if (schemaDefaults) {
        return {
            ...(JSON.parse(JSON.stringify(schemaDefaults)) as Record<string, unknown>),
            ...(overrides || {}),
        };
    }
    if (!type) return overrides || {};
    const template: NodeTemplate | undefined = NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES];
    const base = template?.params
        ? (JSON.parse(JSON.stringify(template.params)) as Record<string, unknown>)
        : {};
    return { ...base, ...(overrides || {}) };
}

// Maps an entity input pin's own label prefix (see addEntityInput's
// `${label} ${n}` naming, e.g. "Локация 3") back to its entity kind —
// backfills `entityKind` on pins added before that field existed on Port,
// so old scenes' entity pins/handles still get their proper per-kind color
// (NodeCard.tsx's portColor) instead of the generic Text color forever.
// output_scene's fixed Visual Render/Motion Render pins never match any
// entity label, so they pass through untouched.
const ENTITY_LABEL_TO_KIND = new Map(
    Array.from(ENTITY_NODE_TYPES).map((type) => [NODE_TEMPLATES[type].label, type]),
);
function inferEntityKind(pinName: string): NodeType | undefined {
    for (const [label, type] of ENTITY_LABEL_TO_KIND) {
        if (pinName.startsWith(`${label} `)) return type;
    }
    return undefined;
}

// Stored graphs may predate params added to templates later (e.g. character
// coordinates) — merge template defaults under stored params so param editors
// never receive undefined and a missing field can't crash the tree. Also
// strips output_scene's old "Arc JSON" output port — it was removed from the
// template once arc/narrative settings became a prompt-composition input
// instead of an output pin, but nodes saved before that change still carry
// it verbatim in their own persisted `outputs` array (nothing else
// retroactively syncs a node's ports to its template). output_scene never
// gets dynamic output pins (unlike entity nodes' Description/JSON), so
// forcing it back to the template's `outputs: []` is always correct, not
// just a one-time migration.
//
// Also re-syncs `color` from the current template on every load — there's no
// per-node color customization anywhere (createNode/duplicateNode are the
// only writers, both just copy the template's color at creation time), so a
// node's color is always meant to equal its template's, never a deliberate
// per-instance override. Without this, a node created before a template's
// color was reassigned (e.g. today's per-entity-type color pass) would keep
// showing the old color forever, on both its own left-border accent and any
// wire leaving it (NodeEditor.tsx's edge coloring).
//
// And backfills `entityKind` on entity nodes' own "JSON" output port —
// added to the template so NodeCard.tsx's portColor can color it by entity
// instead of the generic Text color, same reasoning as the entity input pin
// backfill above. Always the node's own type, so no inference needed.
function withTemplateDefaults(nodes: Node<NodeParams>[]): Node<NodeParams>[] {
    if (!Array.isArray(nodes)) return [];
    return nodes.map((n) => ({
        ...n,
        data: {
            ...n.data,
            color:
                NODE_TEMPLATES[n?.data?.nodeType as keyof typeof NODE_TEMPLATES]?.color ??
                n.data.color,
            params: templateParams(n?.data?.nodeType, n?.data?.params),
            outputs:
                n?.data?.nodeType === "output_scene"
                    ? []
                    : ENTITY_NODE_TYPES.has(n?.data?.nodeType)
                      ? n.data.outputs.map((p) =>
                            p.name === "JSON" && !p.entityKind
                                ? { ...p, entityKind: n.data.nodeType }
                                : p,
                        )
                      : n.data.outputs,
            inputs:
                n?.data?.nodeType === "output_scene"
                    ? n.data.inputs.map((p) => ({
                          ...p,
                          entityKind: p.entityKind ?? inferEntityKind(p.name),
                      }))
                    : n.data.inputs,
        },
    }));
}

// A brand-new scene's graph is just its output node — no character/location
// starter nodes. Used both for "Add Scene" and the very-first-run bootstrap.
// Takes no scene id: the backend assigns that once the scene is created (see
// loadInitialGraphState/createScene), so the output node gets its own
// internal random id instead — nothing keys off that literal string beyond
// this one graph (deriveScenes/cascade-delete match on nodeType, not id).
function createEmptySceneGraph(overrides: { title?: string; start?: number } = {}): {
    nodes: Node<NodeParams>[];
    edges: Edge[];
} {
    const outId = `node_out_${crypto.randomUUID()}`;

    const nodes: Node<NodeParams>[] = [
        {
            id: outId,
            type: "custom",
            position: { x: 200, y: 150 },
            data: {
                nodeType: "output_scene",
                label: "Выходная Сцена",
                icon: "ti-movie",
                color: "var(--color-node-scene)",
                inputs: [
                    { id: `${outId}_in_0`, name: "Visual Render", type: "Image" },
                    { id: `${outId}_in_1`, name: "Motion Render", type: "Video" },
                ],
                outputs: [],
                params: templateParams("output_scene", overrides),
            },
        },
    ];

    return { nodes, edges: [] };
}

// Builds the Timeline's scene list straight from each scene's `output_scene`
// node params — a scene with no such node (deleted, or never had one) simply
// doesn't count. Sorted by `start`; `num` is a display label, not stored.
function deriveScenes(graphs: SceneGraphs): TimelineScene[] {
    const list: Omit<TimelineScene, "num">[] = [];
    for (const [sceneId, graph] of Object.entries(graphs)) {
        const outNode = graph.nodes.find((n) => n.data?.nodeType === "output_scene");
        if (!outNode) continue;
        const p = outNode.data.params as Record<string, unknown>;
        list.push({
            id: sceneId,
            title: (p.title as string) ?? "",
            start: (p.start as number) ?? 0,
            duration: (p.duration as number) ?? 0,
            track: (p.track as number) === 2 ? 2 : 1,
            coverUrl: (p.coverUrl as string) ?? "",
            cameraActive: true,
        });
    }
    list.sort((a, b) => a.start - b.start);
    return list.map((s, i) => ({ ...s, num: String(i + 1).padStart(2, "0") }));
}

interface InitialGraphState {
    activeSceneId: string;
    sceneGraphs: SceneGraphs;
    nodes: Node<NodeParams>[];
    edges: Edge[];
}

function titleFromGraph(graph: { nodes: Node<NodeParams>[]; edges: Edge[] }): string {
    const outNode = graph.nodes?.find((n) => n?.data?.nodeType === "output_scene");
    const title = (outNode?.data.params as Record<string, unknown> | undefined)?.title;
    return typeof title === "string" && title ? title : "Сцена";
}

// Loads every scene from the backend (source of truth — see DECISIONS.md's
// Scenes/Media persistence entry). If the backend has none yet, one-time
// migrates whatever's still sitting in localStorage from before this cutover
// instead of silently discarding it, or bootstraps a single blank scene if
// there's nothing to migrate either. Never re-runs once the backend has ≥1
// scene, so `SCENE_GRAPHS_KEY` is cleared right after a successful migration
// (otherwise deleting every scene later would re-migrate the stale snapshot).
async function loadInitialGraphState(): Promise<InitialGraphState> {
    let scenes = await hayverseApiClient.scenes.list();

    if (scenes.length === 0) {
        const legacyEntries = Object.entries(loadStoredSceneGraphs());
        scenes =
            legacyEntries.length > 0
                ? await Promise.all(
                      legacyEntries.map(([, graph]) =>
                          hayverseApiClient.scenes.create({ title: titleFromGraph(graph), graph }),
                      ),
                  )
                : [
                      await hayverseApiClient.scenes.create({
                          title: "Сцена 1",
                          graph: createEmptySceneGraph({ title: "Сцена 1" }),
                      }),
                  ];
        removeKey(SCENE_GRAPHS_KEY);
    }

    const sceneGraphs: SceneGraphs = {};
    for (const scene of scenes) {
        sceneGraphs[scene.id] = scene.graph as { nodes: Node<NodeParams>[]; edges: Edge[] };
    }

    const urlSceneId =
        typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("scene")
            : null;
    const storedSceneId = readRaw(ACTIVE_SCENE_KEY);
    const activeSceneId =
        (urlSceneId && sceneGraphs[urlSceneId] ? urlSceneId : null) ??
        (storedSceneId && sceneGraphs[storedSceneId] ? storedSceneId : null) ??
        scenes[0].id;

    const activeGraph = sceneGraphs[activeSceneId];
    return {
        activeSceneId,
        sceneGraphs,
        nodes: withTemplateDefaults(activeGraph.nodes),
        edges: activeGraph.edges,
    };
}

function findPort(
    nodes: Node<NodeParams>[],
    nodeId: string | null | undefined,
    handleId: string | null | undefined,
    direction: "source" | "target",
): Port | undefined {
    const node = nodes.find((n) => n.id === nodeId);
    const ports = direction === "source" ? node?.data.outputs : node?.data.inputs;
    return ports?.find((p) => p.id === handleId);
}

interface GraphCtx {
    nodes: Node<NodeParams>[];
    edges: Edge[];
    resolved: Record<string, unknown>;
    sceneOutputs: Record<string, SceneOutput>;
    allSceneGraphs: SceneGraphs;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    isValidConnection: IsValidConnection;

    selectedNodeId: string | null;
    selectNode: (id: string | null) => void;

    createNode: (type: NodeType, x: number, y: number) => Node<NodeParams> | null;
    duplicateNode: (id: string) => void;
    deleteNode: (id: string) => void;
    renameNode: (nodeId: string, label: string) => void;
    setNodeField: (nodeId: string, patch: Partial<NodeParams>) => void;
    updateNodeParam: (nodeId: string, key: string, value: unknown) => void;
    updateNodeParams: (
        nodeId: string,
        patch: Record<string, unknown>,
        opts?: { skipHistory?: boolean },
    ) => void;
    setNodePhotos: (nodeId: string, photos: string[], coverPhotoIndex: number) => void;
    addImageInput: (nodeId: string) => void;
    addTextInput: (nodeId: string) => void;
    addEntityInput: (nodeId: string, entityType: NodeType, entityLabel: string) => void;
    removePinInput: (nodeId: string, portId: string) => void;
    undo: () => void;
    redo: () => void;
    executeGraph: () => Promise<void>;
    runNode: (nodeId: string, paramOverrides?: Record<string, unknown>) => Promise<void>;
    runningNodeIds: Set<string>;
    loadPinterestBoards: (node: NodeRef) => Promise<void>;
    loadPinterestPins: (node: NodeRef, boardId: string) => Promise<void>;

    showMiniMap: boolean;
    setShowMiniMap: (v: boolean) => void;

    activeSceneId: string | null;
    setActiveSceneId: (id: string) => void;

    scenes: TimelineScene[];
    createScene: () => void;

    showMontageMonitor: boolean;
    setShowMontageMonitor: (v: boolean) => void;

    showWorldMap: boolean;
    setShowWorldMap: (v: boolean) => void;

    worldMapFullscreen: boolean;
    setWorldMapFullscreen: (v: boolean) => void;

    showTimeline: boolean;
    setShowTimeline: (v: boolean) => void;

    totalDuration: number;
    setTotalDuration: (seconds: number) => void;
}

const Ctx = createContext<GraphCtx>(null!);
export const useGraphContext = () => useContext(Ctx);

export function GraphProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToastContext();
    const { pinterestStatus } = useUserContext();

    // SSR-safe default: identical on the server and the client's first paint
    // (no localStorage/URL access), matching the "no scenes yet" state the app
    // already renders correctly. The real data loads in the mount effect below.
    const [activeSceneId, setActiveSceneIdState] = useState<string | null>(null);
    const [sceneGraphs, setSceneGraphs] = useState<SceneGraphs>({});
    const [nodes, setNodes] = useState<Node<NodeParams>[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const history = useGraphHistory({
        nodes,
        edges,
        selectedNodeId,
        activeSceneId,
        setNodes,
        setEdges,
        setSelectedNodeId,
    });
    const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
    const [showMontageMonitor, setShowMontageMonitor] = useState<boolean>(false);
    const [showWorldMap, setShowWorldMap] = useState<boolean>(false);
    const [worldMapFullscreen, setWorldMapFullscreen] = useState<boolean>(false);
    const [showTimeline, setShowTimeline] = useState<boolean>(true);

    const [totalDuration, setTotalDurationState] = useState<number>(DEFAULT_TOTAL_DURATION);
    const setTotalDuration = useCallback(
        (seconds: number) => {
            const clamped = Math.max(1, Math.round(seconds));
            setTotalDurationState(clamped);
            writeRaw(TIMELINE_DURATION_KEY, String(clamped), () =>
                showToast("Не удалось сохранить длительность фильма (превышен лимит хранилища)"),
            );
        },
        [showToast],
    );

    // Loads the real (backend-fetched) graph state once on mount — deferred
    // out of a lazy useState initializer so the server and the client's
    // first paint render the same SSR-safe default above, avoiding a
    // hydration mismatch. The URL-cleanup step is folded in here rather than
    // kept as its own mount effect: both would be `[]`-dep effects in this
    // same component, so they'd run in source-declaration order — if cleanup
    // ran first it would strip `?scene=` before loadInitialGraphState's own
    // read of it, silently breaking `?scene=`-based deep links.
    useEffect(() => {
        // Syncing from localStorage/the backend/URL, external systems
        // unreadable at render time on the server; this is the documented
        // valid case for the rule.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTotalDurationState(loadStoredTotalDuration());

        let cancelled = false;
        loadInitialGraphState()
            .then((initial) => {
                if (cancelled) return;

                setActiveSceneIdState(initial.activeSceneId);
                setSceneGraphs(initial.sceneGraphs);
                setNodes(initial.nodes);
                setEdges(initial.edges);

                const params = new URLSearchParams(window.location.search);
                if (params.get("scene")) {
                    const newUrl =
                        window.location.protocol +
                        "//" +
                        window.location.host +
                        window.location.pathname;
                    window.history.replaceState({ path: newUrl }, "", newUrl);
                }
            })
            .catch(() => {
                if (!cancelled) showToast("Не удалось загрузить сцены с сервера");
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Loads a scene's graph into the live editor state (or clears the canvas
    // when `nextId` is null, i.e. no scenes remain).
    const loadSceneIntoState = useCallback(
        (nextId: string | null, graphs: SceneGraphs) => {
            history.flush();
            if (nextId) {
                const nextGraph = graphs[nextId] || createEmptySceneGraph();
                setNodes(withTemplateDefaults(nextGraph.nodes));
                setEdges(nextGraph.edges);
                writeRaw(ACTIVE_SCENE_KEY, nextId);
            } else {
                setNodes([]);
                setEdges([]);
                removeKey(ACTIVE_SCENE_KEY);
            }
            setSelectedNodeId(null);
            setActiveSceneIdState(nextId);
        },
        [history],
    );

    const setActiveSceneId = useCallback(
        (nextId: string) => {
            if (nextId === activeSceneId) return;
            // Save the outgoing scene's live graph, then swap in the next
            // one. The local cache updates immediately (optimistic); the
            // backend save runs in the background and only surfaces on
            // failure — same "toast, don't block" pattern used throughout
            // this file.
            const updated = activeSceneId
                ? { ...sceneGraphs, [activeSceneId]: { nodes, edges } }
                : sceneGraphs;
            setSceneGraphs(updated);
            if (activeSceneId) {
                hayverseApiClient.scenes
                    .update(activeSceneId, { graph: { nodes, edges } })
                    .catch(() => showToast("Не удалось сохранить граф сцены на сервере"));
            }
            loadSceneIntoState(nextId, updated);
        },
        [activeSceneId, nodes, edges, sceneGraphs, showToast, loadSceneIntoState],
    );

    // ── React Flow handlers ─────────────────────────────────────────────────────

    const onNodesChange: OnNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // "select"/"dimensions" are pure React-Flow-internal bookkeeping
            // (styledNodes in NodeEditor.tsx already re-derives `.selected`
            // from selectedNodeId every render, so a stale value in a stored
            // snapshot is inert) — ignored so a plain click never creates a
            // history entry.
            const relevant = changes.filter((c) => c.type !== "select" && c.type !== "dimensions");
            if (relevant.length > 0) {
                const isRemove = relevant.some((c) => c.type === "remove");
                const isDragMove = !isRemove && relevant.some((c) => c.type === "position");
                history.record(isDragMove ? "drag" : null);
            }
            setNodes((ns) => applyNodeChanges(changes, ns) as Node<NodeParams>[]);
            if (relevant.some((c) => c.type === "position" && c.dragging === false)) {
                history.flush();
            }
        },
        [history],
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            if (changes.some((c) => c.type !== "select")) history.record(null);
            setEdges((es) => applyEdgeChanges(changes, es));
        },
        [history],
    );

    // Input pins accept a single edge by default (see Port.allowMultiple) —
    // wiring a new connection into an already-occupied one replaces it
    // instead of stacking a second edge onto the same handle.
    const onConnect: OnConnect = useCallback(
        (conn: Connection) => {
            history.record(null);
            const targetPort = findPort(nodes, conn.target, conn.targetHandle, "target");
            setEdges((es) => {
                const withoutStale = targetPort?.allowMultiple
                    ? es
                    : es.filter(
                          (e) =>
                              !(e.target === conn.target && e.targetHandle === conn.targetHandle),
                      );
                return addEdge(conn, withoutStale);
            });
        },
        [nodes, history],
    );

    const isValidConnection: IsValidConnection = useCallback(
        (conn) => {
            const sourcePort = findPort(nodes, conn.source, conn.sourceHandle, "source");
            const targetPort = findPort(nodes, conn.target, conn.targetHandle, "target");
            if (!sourcePort || !targetPort) return false;
            if (sourcePort.type !== targetPort.type) return false;
            // Every entity kind's JSON output is typed as plain "Text" (see
            // Port's own doc comment), so the type check above alone would
            // let e.g. a Location's JSON be wired into a "Character 1" pin —
            // entityKind narrows an output_scene entity pin to its own kind.
            if (targetPort.entityKind) {
                const sourceNode = nodes.find((n) => n.id === conn.source);
                if (sourceNode?.data.nodeType !== targetPort.entityKind) return false;
            }
            return true;
        },
        [nodes],
    );

    // ── Graph persistence (debounced autosave to the backend) ──────────────────

    // Same 400ms-debounce shape as the shared useDebouncedPersist hook
    // (usePersistedState.ts), inlined here rather than reused: that hook is
    // hardcoded to localStorage and is also used by PresetLibraryContext,
    // out of scope for this change. Only the active scene's graph is saved —
    // every other scene was already persisted when it stopped being active
    // (see setActiveSceneId/createScene/the cascade-delete effect below).
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!activeSceneId) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const sceneId = activeSceneId;
        saveTimer.current = setTimeout(() => {
            const graph = { nodes, edges };
            setSceneGraphs((prev) => ({ ...prev, [sceneId]: graph }));
            hayverseApiClient.scenes
                .update(sceneId, { graph })
                .catch(() => showToast("Не удалось сохранить граф сцены на сервере"));
        }, 400);
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, [nodes, edges, activeSceneId, showToast]);

    // ── Scene list (derived from each scene's output_scene node) ────────────────

    // Merges the *live*, not-yet-debounce-saved active scene on top of the
    // saved snapshot of every other scene, so editing a scene's params (title,
    // start, cover...) updates the Timeline immediately.
    const mergedGraphsForDerivation = useMemo(
        () => (activeSceneId ? { ...sceneGraphs, [activeSceneId]: { nodes, edges } } : sceneGraphs),
        [sceneGraphs, activeSceneId, nodes, edges],
    );
    const scenes = useMemo(
        () => deriveScenes(mergedGraphsForDerivation),
        [mergedGraphsForDerivation],
    );

    // Cascade-delete: if the active scene's `output_scene` node disappears —
    // whether via the NodeCard menu's `deleteNode` or React Flow's built-in
    // `Delete`-key path (which bypasses `deleteNode` entirely, see
    // NodeEditor.tsx's `deleteKeyCode` prop) — remove the whole scene and
    // switch to whichever remaining scene starts earliest (or clear the
    // canvas if none remain). Only the active scene's graph is ever editable
    // from the canvas, so watching `nodes` here is sufficient.
    const prevSceneIdRef = useRef<string | null>(null);
    const prevHadOutputRef = useRef<boolean>(false);
    useEffect(() => {
        if (prevSceneIdRef.current !== activeSceneId) {
            prevSceneIdRef.current = activeSceneId;
            prevHadOutputRef.current = activeSceneId
                ? nodes.some((n) => n.data.nodeType === "output_scene")
                : false;
            return;
        }

        const hasOutputNow = nodes.some((n) => n.data.nodeType === "output_scene");
        if (activeSceneId && prevHadOutputRef.current && !hasOutputNow) {
            const deletedId = activeSceneId;
            const updated = { ...sceneGraphs };
            delete updated[deletedId];
            setSceneGraphs(updated);
            history.garbageCollectScene(deletedId);
            hayverseApiClient.scenes
                .remove(deletedId)
                .catch(() => showToast("Не удалось удалить сцену на сервере"));
            const remaining = deriveScenes(updated); // sorted by start ascending
            loadSceneIntoState(remaining[0]?.id ?? null, updated);
        }
        prevHadOutputRef.current = hasOutputNow;
    }, [nodes, activeSceneId, sceneGraphs, showToast, loadSceneIntoState, history]);

    const createScene = useCallback(() => {
        // New scenes always default to track 1 — chain after track 1's last scene
        // specifically, not the global end across both tracks, so consecutive
        // adds never accidentally overlap a scene sitting on track 2.
        const track1Scenes = scenes.filter((s) => s.track === 1);
        const start = track1Scenes.length
            ? Math.max(...track1Scenes.map((s) => s.start + s.duration))
            : 0;
        const title = `Сцена ${scenes.length + 1}`;
        const newGraph = createEmptySceneGraph({ title, start });

        if (activeSceneId) {
            hayverseApiClient.scenes
                .update(activeSceneId, { graph: { nodes, edges } })
                .catch(() => showToast("Не удалось сохранить граф сцены на сервере"));
        }

        hayverseApiClient.scenes
            .create({ title, graph: newGraph })
            .then((created) => {
                const updated = {
                    ...sceneGraphs,
                    ...(activeSceneId ? { [activeSceneId]: { nodes, edges } } : {}),
                    [created.id]: newGraph,
                };
                setSceneGraphs(updated);
                loadSceneIntoState(created.id, updated);
            })
            .catch(() => showToast("Не удалось создать сцену на сервере"));
    }, [activeSceneId, nodes, edges, sceneGraphs, scenes, showToast, loadSceneIntoState]);

    // ── Graph actions ───────────────────────────────────────────────────────────

    const selectNode = useCallback((id: string | null) => {
        setSelectedNodeId(id);
    }, []);

    const createNode = useCallback(
        (type: NodeType, x: number, y: number): Node<NodeParams> | null => {
            const template = NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES];
            if (!template) return null;

            history.record(null);
            const id = crypto.randomUUID();
            const newNode: Node<NodeParams> = {
                id,
                type: "custom",
                position: { x: Math.max(0, x), y: Math.max(0, y) },
                data: {
                    nodeType: type,
                    label: template.label,
                    icon: template.icon,
                    color: template.color,
                    inputs: template.inputs.map((inp, i) => ({ ...inp, id: `${id}_in_${i}` })),
                    outputs: template.outputs.map((out, i) => ({ ...out, id: `${id}_out_${i}` })),
                    params: templateParams(type),
                },
            };

            setNodes((ns) => [...ns, newNode]);
            return newNode;
        },
        [history],
    );

    const duplicateNode = useCallback(
        (id: string) => {
            history.record(null);
            setNodes((ns) => {
                const source = ns.find((n) => n.id === id);
                if (!source) return ns;

                const newId = crypto.randomUUID();
                const clonedData = structuredClone(source.data);
                const outputs = ENTITY_NODE_TYPES.has(source.data.nodeType)
                    ? withPhotoOutputs(
                          newId,
                          clonedData.outputs.map((out, i) => ({ ...out, id: `${newId}_out_${i}` })),
                          (clonedData.params.photos as string[] | undefined) ?? [],
                      )
                    : clonedData.outputs.map((out, i) => ({ ...out, id: `${newId}_out_${i}` }));
                const duplicated: Node<NodeParams> = {
                    ...source,
                    id: newId,
                    position: { x: source.position.x + 40, y: source.position.y + 40 },
                    data: {
                        ...clonedData,
                        inputs: source.data.inputs.map((inp, i) => ({
                            ...inp,
                            id: `${newId}_in_${i}`,
                        })),
                        outputs,
                    },
                    selected: false,
                };

                setSelectedNodeId(newId);
                return [...ns, duplicated];
            });
        },
        [history],
    );

    const deleteNode = useCallback(
        (id: string) => {
            history.record(null);
            setNodes((ns) => ns.filter((n) => n.id !== id));
            setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
            setSelectedNodeId(null);
        },
        [history],
    );

    const renameNode = useCallback(
        (nodeId: string, label: string) => {
            history.record(null);
            setNodes((ns) =>
                ns.map((n) => (n.id !== nodeId ? n : { ...n, data: { ...n.data, label } })),
            );
        },
        [history],
    );

    const setNodeField = useCallback(
        (nodeId: string, patch: Partial<NodeParams>) => {
            // Pure UI toggles (showJsonPreview etc.) don't count as
            // undoable content — only record if the patch touches something
            // else (e.g. the `generation` sibling field on history scrub).
            if (Object.keys(patch).some((k) => !UI_ONLY_FIELD_KEYS.has(k as keyof NodeParams))) {
                history.record(null);
            }
            setNodes((ns) =>
                ns.map((n) => (n.id !== nodeId ? n : { ...n, data: { ...n.data, ...patch } })),
            );
        },
        [history],
    );

    const updateNodeParam = useCallback(
        (nodeId: string, key: string, value: unknown) => {
            history.record(`param:${nodeId}:${key}`);
            setNodes((ns) =>
                ns.map((n) =>
                    n.id !== nodeId
                        ? n
                        : { ...n, data: { ...n.data, params: { ...n.data.params, [key]: value } } },
                ),
            );
        },
        [history],
    );

    // Appends a new "Reference Image N" input pin to a node (used by nodes
    // like Nano Banana that accept a variable number of reference images).
    // Capped at 14 reference images — Nano Banana's own API limit. Ids use a
    // random suffix rather than a position index: a position-based id can
    // collide with a surviving pin's id after a mid-array removal (see
    // removePinInput), and React Flow requires unique handle ids per node —
    // a collision silently breaks connections to one of the duplicate pins.
    const addImageInput = useCallback(
        (nodeId: string) => {
            history.record(null);
            setNodes((ns) =>
                ns.map((n) => {
                    if (n.id !== nodeId) return n;
                    const imageCount = n.data.inputs.length - 1;
                    if (imageCount >= MAX_REFERENCE_IMAGES) return n;
                    const newPort: Port = {
                        id: `${nodeId}_in_${crypto.randomUUID()}`,
                        name: `Reference Image ${n.data.inputs.length}`,
                        type: "Image",
                    };
                    return { ...n, data: { ...n.data, inputs: [...n.data.inputs, newPort] } };
                }),
            );
        },
        [history],
    );

    // Appends a new "Text N" input pin to a node (used by text_prompt, which
    // pairs each pin with its own wirable field — see WirableTextField usage
    // in TextParams). Same random-suffix id scheme as addImageInput above —
    // these are additionally keyed into `params` by their own id, so a
    // colliding id after a mid-array removal would also alias a surviving
    // pin's stored text. Capped like addImageInput's imageCount — excluding
    // the node's own fixed "Text" pin (index 0).
    const addTextInput = useCallback(
        (nodeId: string) => {
            history.record(null);
            setNodes((ns) =>
                ns.map((n) => {
                    if (n.id !== nodeId) return n;
                    const extraCount = n.data.inputs.length - 1;
                    if (extraCount >= MAX_TEXT_INPUTS) return n;
                    const newPort: Port = {
                        id: `${nodeId}_in_${crypto.randomUUID()}`,
                        name: `Text ${n.data.inputs.length + 1}`,
                        type: "Text",
                    };
                    return { ...n, data: { ...n.data, inputs: [...n.data.inputs, newPort] } };
                }),
            );
        },
        [history],
    );

    // Appends a new typed entity-input pin to output_scene (e.g. "+ Character"
    // → "Character 1", a second click → "Character 2"), one such group per
    // entity kind (see OutputParams's "Сущности" tab). Numbered per-kind by
    // counting existing pins whose name already starts with that label, so
    // removing/adding one kind's pins never renumbers another kind's. Fixed
    // pins (Visual Render/Motion Render) don't carry a kind prefix so they're
    // naturally excluded from both the count and the cap below. Same
    // random-suffix id scheme as addImageInput/addTextInput.
    const addEntityInput = useCallback(
        (nodeId: string, entityType: NodeType, entityLabel: string) => {
            history.record(null);
            setNodes((ns) =>
                ns.map((n) => {
                    if (n.id !== nodeId) return n;
                    const fixedPinCount = NODE_TEMPLATES.output_scene.inputs.length;
                    const entityPinCount = n.data.inputs.length - fixedPinCount;
                    if (entityPinCount >= MAX_ENTITY_INPUTS) return n;
                    const prefix = `${entityLabel} `;
                    const existingOfKind = n.data.inputs.filter((p) =>
                        p.name.startsWith(prefix),
                    ).length;
                    const newPort: Port = {
                        id: `${nodeId}_in_${crypto.randomUUID()}`,
                        name: `${entityLabel} ${existingOfKind + 1}`,
                        type: "Text",
                        entityKind: entityType,
                    };
                    return { ...n, data: { ...n.data, inputs: [...n.data.inputs, newPort] } };
                }),
            );
        },
        [history],
    );

    const removePinInput = useCallback(
        (nodeId: string, portId: string) => {
            history.record(null);
            setNodes((ns) =>
                ns.map((n) =>
                    n.id !== nodeId
                        ? n
                        : {
                              ...n,
                              data: {
                                  ...n.data,
                                  inputs: n.data.inputs.filter((p) => p.id !== portId),
                              },
                          },
                ),
            );
            setEdges((es) => es.filter((e) => e.targetHandle !== portId));
        },
        [history],
    );

    const updateNodeParams = useCallback(
        (nodeId: string, patch: Record<string, unknown>, opts?: { skipHistory?: boolean }) => {
            if (!opts?.skipHistory) history.record(null);
            setNodes((ns) =>
                ns.map((n) =>
                    n.id !== nodeId
                        ? n
                        : { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } },
                ),
            );
        },
        [history],
    );

    // Single place that mutates a rich entity node's photos — keeps its
    // per-photo output pins (one per photo, id'd by blob ref) in sync with
    // the array, and prunes edges wired to any pin that no longer exists.
    const setNodePhotos = useCallback(
        (nodeId: string, photos: string[], coverPhotoIndex: number) => {
            history.record(null);
            const capped = photos.slice(0, MAX_ENTITY_PHOTOS);
            setNodes((ns) =>
                ns.map((n) =>
                    n.id !== nodeId
                        ? n
                        : {
                              ...n,
                              data: {
                                  ...n.data,
                                  outputs: withPhotoOutputs(nodeId, n.data.outputs, capped),
                                  params: { ...n.data.params, photos: capped, coverPhotoIndex },
                              },
                          },
                ),
            );
            const photoPrefix = `${nodeId}_photo_`;
            const validIds = new Set(capped.map((ref) => `${photoPrefix}${ref}`));
            setEdges((es) =>
                es.filter(
                    (e) =>
                        e.source !== nodeId ||
                        !e.sourceHandle?.startsWith(photoPrefix) ||
                        validIds.has(e.sourceHandle),
                ),
            );
        },
        [history],
    );

    const graphExecution = useGraphExecution({
        nodes,
        edges,
        setNodes,
        activeSceneId,
        showToast,
        pinterestConnected: pinterestStatus?.connected ?? false,
    });

    // ── Assemble and expose ─────────────────────────────────────────────────────

    const ctx: GraphCtx = {
        nodes,
        edges,
        ...graphExecution,
        allSceneGraphs: mergedGraphsForDerivation,
        onNodesChange,
        onEdgesChange,
        onConnect,
        isValidConnection,
        selectedNodeId,
        selectNode,
        createNode,
        duplicateNode,
        deleteNode,
        renameNode,
        setNodeField,
        updateNodeParam,
        updateNodeParams,
        setNodePhotos,
        addImageInput,
        addTextInput,
        addEntityInput,
        removePinInput,
        undo: history.undo,
        redo: history.redo,
        showMiniMap,
        setShowMiniMap,
        activeSceneId,
        setActiveSceneId,
        scenes,
        createScene,
        showMontageMonitor,
        setShowMontageMonitor,
        showWorldMap,
        setShowWorldMap,
        worldMapFullscreen,
        setWorldMapFullscreen,
        showTimeline,
        setShowTimeline,
        totalDuration,
        setTotalDuration,
    };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
