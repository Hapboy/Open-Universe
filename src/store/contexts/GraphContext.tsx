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
import { ENTITY_NODE_TYPES, NODE_TEMPLATES } from "../../data/nodes.ts";
import type { NodeParams, NodeRef, Port, TimelineScene } from "../../types.ts";
import type { NodeType } from "../../types/enums.ts";
import type { SceneOutput } from "../../core/graph.ts";
import { useToastContext } from "./ToastContext.tsx";
import { useNarrativeContext } from "./NarrativeContext.tsx";
import { readJSON, readRaw, removeKey, writeJSON, writeRaw } from "../../core/browserStorage.ts";
import { buildPhotoPorts } from "../../core/characterPorts.ts";
import { useDebouncedPersist } from "../hooks/usePersistedState.ts";
import { useGraphExecution } from "./graphExecution.ts";

const SCENE_GRAPHS_KEY = "hv_scene_graphs";
const ACTIVE_SCENE_KEY = "hv_active_scene_id";
const TIMELINE_DURATION_KEY = "hv_timeline_duration";
const DEFAULT_TOTAL_DURATION = 60; // 01:00 in seconds
const MAX_REFERENCE_IMAGES = 14; // Nano Banana's own API limit
const MAX_TEXT_INPUTS = 8; // text_prompt's own dynamic-field cap
const MAX_ENTITY_PHOTOS = 10;

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

// A pure read: the URL param is honored immediately for the initial render,
// but persisting it is the mount effect's job (see "Clean query parameter"
// below) — this function has no side effects, so it's safe to call from a
// lazy initializer.
function loadActiveSceneId(): string {
    if (typeof window !== "undefined") {
        const sceneParam = new URLSearchParams(window.location.search).get("scene");
        if (sceneParam) return sceneParam;
    }
    return readRaw(ACTIVE_SCENE_KEY) || "sc1";
}

// Params from the node template, deep-cloned, with overrides on top.
function templateParams(type: string, overrides: Record<string, unknown> = {}) {
    if (!type) return overrides || {};
    const template = NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES];
    const base = template
        ? (JSON.parse(JSON.stringify(template.params)) as Record<string, unknown>)
        : {};
    return { ...base, ...(overrides || {}) };
}

// Stored graphs may predate params added to templates later (e.g. character
// coordinates) — merge template defaults under stored params so param editors
// never receive undefined and a missing field can't crash the tree.
function withTemplateDefaults(nodes: Node<NodeParams>[]): Node<NodeParams>[] {
    if (!Array.isArray(nodes)) return [];
    return nodes.map((n) => ({
        ...n,
        data: {
            ...n.data,
            params: templateParams(n?.data?.nodeType, n?.data?.params),
        },
    }));
}

// A brand-new scene's graph is just its output node — no character/location
// starter nodes. Used both for "Add Scene" and the very-first-run bootstrap.
function createEmptySceneGraph(
    sceneId: string,
    overrides: { title?: string; start?: number } = {},
): { nodes: Node<NodeParams>[]; edges: Edge[] } {
    const outId = `node_out_${sceneId}`;

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
                outputs: [{ id: `${outId}_out_0`, name: "Arc JSON", type: "Text" }],
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

// Parses localStorage exactly once for the initial render (the old code read
// `loadActiveSceneId`/`loadStoredSceneGraphs` independently up to 3 times on
// mount — once per lazy initializer — each re-parsing the same blob).
function loadInitialGraphState(): InitialGraphState {
    const activeSceneId = loadActiveSceneId();
    const sceneGraphs = loadStoredSceneGraphs();
    const activeGraph = sceneGraphs[activeSceneId] || createEmptySceneGraph(activeSceneId);
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
    updateNodeParams: (nodeId: string, patch: Record<string, unknown>) => void;
    setNodePhotos: (nodeId: string, photos: string[], photoIdx: number) => void;
    addImageInput: (nodeId: string) => void;
    addTextInput: (nodeId: string) => void;
    removePinInput: (nodeId: string, portId: string) => void;
    executeGraph: () => Promise<void>;
    runNode: (nodeId: string) => Promise<void>;
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

    totalDuration: number;
    setTotalDuration: (seconds: number) => void;
}

const Ctx = createContext<GraphCtx>(null!);
export const useGraphContext = () => useContext(Ctx);

export function GraphProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToastContext();
    const { narrativeSettings, getSceneNarrativeSettings } = useNarrativeContext();

    // SSR-safe default: identical on the server and the client's first paint
    // (no localStorage/URL access), matching the "no scenes yet" state the app
    // already renders correctly. The real data loads in the mount effect below.
    const [activeSceneId, setActiveSceneIdState] = useState<string | null>(null);
    const [sceneGraphs, setSceneGraphs] = useState<SceneGraphs>({});
    const [nodes, setNodes] = useState<Node<NodeParams>[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
    const [showMontageMonitor, setShowMontageMonitor] = useState<boolean>(false);
    const [showWorldMap, setShowWorldMap] = useState<boolean>(false);
    const [worldMapFullscreen, setWorldMapFullscreen] = useState<boolean>(false);

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

    // Loads the real (localStorage/URL-derived) graph state once on mount —
    // deferred out of a lazy useState initializer so the server and the
    // client's first paint render the same SSR-safe default above, avoiding a
    // hydration mismatch. The URL-cleanup step is folded in here rather than
    // kept as its own mount effect: both would be `[]`-dep effects in this
    // same component, so they'd run in source-declaration order — if cleanup
    // ran first it would strip `?scene=` before loadInitialGraphState's own
    // read of it, silently breaking `?scene=`-based deep links.
    useEffect(() => {
        const initial = loadInitialGraphState();
        // Syncing from localStorage/the URL, an external system unreadable at
        // render time on the server; this is the documented valid case for
        // the rule.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveSceneIdState(initial.activeSceneId);
        setSceneGraphs(initial.sceneGraphs);
        setNodes(initial.nodes);
        setEdges(initial.edges);
        setTotalDurationState(loadStoredTotalDuration());

        const params = new URLSearchParams(window.location.search);
        if (params.get("scene")) {
            const newUrl =
                window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: newUrl }, "", newUrl);
        }
    }, []);

    const persistSceneGraphs = useCallback(
        (updated: SceneGraphs) => {
            writeJSON(SCENE_GRAPHS_KEY, updated, () =>
                showToast("Не удалось сохранить граф сцены (превышен лимит хранилища)"),
            );
            setSceneGraphs(updated);
        },
        [showToast],
    );

    // Loads a scene's graph into the live editor state (or clears the canvas
    // when `nextId` is null, i.e. no scenes remain).
    const loadSceneIntoState = useCallback((nextId: string | null, graphs: SceneGraphs) => {
        if (nextId) {
            const nextGraph = graphs[nextId] || createEmptySceneGraph(nextId);
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
    }, []);

    const setActiveSceneId = useCallback(
        (nextId: string) => {
            if (nextId === activeSceneId) return;
            // Persist the current scene graph, then swap in the next one. State
            // setters are called directly, one after another — not from inside
            // another setState's updater function — so this stays a plain
            // synchronous sequence with no nested-updater purity concerns.
            const updated = activeSceneId
                ? { ...sceneGraphs, [activeSceneId]: { nodes, edges } }
                : sceneGraphs;
            persistSceneGraphs(updated);
            loadSceneIntoState(nextId, updated);
        },
        [activeSceneId, nodes, edges, sceneGraphs, persistSceneGraphs, loadSceneIntoState],
    );

    // ── React Flow handlers ─────────────────────────────────────────────────────

    const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((ns) => applyNodeChanges(changes, ns) as Node<NodeParams>[]);
    }, []);

    const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
        setEdges((es) => applyEdgeChanges(changes, es));
    }, []);

    const onConnect: OnConnect = useCallback((conn: Connection) => {
        setEdges((es) => addEdge(conn, es));
    }, []);

    const isValidConnection: IsValidConnection = useCallback(
        (conn) => {
            const sourcePort = findPort(nodes, conn.source, conn.sourceHandle, "source");
            const targetPort = findPort(nodes, conn.target, conn.targetHandle, "target");
            if (!sourcePort || !targetPort) return false;
            return sourcePort.type === targetPort.type;
        },
        [nodes],
    );

    // ── Graph persistence (temp localStorage autosave; will move to a backend) ──

    // `sceneGraphs` deliberately omitted from the deps array below: every
    // code path that changes the map (switching, adding, or cascade-removing
    // a scene) also changes activeSceneId or nodes/edges, which already
    // re-arms this with a fresh closure — adding `sceneGraphs` itself would
    // re-arm the timer on every save, since saving is exactly what changes it.
    useDebouncedPersist(
        SCENE_GRAPHS_KEY,
        () => ({ ...sceneGraphs, [activeSceneId!]: { nodes, edges } }),
        [nodes, edges, activeSceneId],
        {
            enabled: activeSceneId != null,
            onError: () => showToast("Не удалось сохранить граф сцены (превышен лимит хранилища)"),
            onPersist: setSceneGraphs,
        },
    );

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
            const updated = { ...sceneGraphs };
            delete updated[activeSceneId];
            persistSceneGraphs(updated);
            const remaining = deriveScenes(updated); // sorted by start ascending
            loadSceneIntoState(remaining[0]?.id ?? null, updated);
        }
        prevHadOutputRef.current = hasOutputNow;
    }, [nodes, activeSceneId, sceneGraphs, persistSceneGraphs, loadSceneIntoState]);

    const createScene = useCallback(() => {
        const idPool = new Set([
            ...Object.keys(sceneGraphs),
            ...(activeSceneId ? [activeSceneId] : []),
        ]);
        let maxN = 0;
        idPool.forEach((id) => {
            const m = /^sc(\d+)$/.exec(id);
            if (m) maxN = Math.max(maxN, Number(m[1]));
        });
        const newId = `sc${maxN + 1}`;

        // New scenes always default to track 1 — chain after track 1's last scene
        // specifically, not the global end across both tracks, so consecutive
        // adds never accidentally overlap a scene sitting on track 2.
        const track1Scenes = scenes.filter((s) => s.track === 1);
        const start = track1Scenes.length
            ? Math.max(...track1Scenes.map((s) => s.start + s.duration))
            : 0;
        const newGraph = createEmptySceneGraph(newId, { title: `Сцена ${maxN + 1}`, start });

        const updated = {
            ...sceneGraphs,
            ...(activeSceneId ? { [activeSceneId]: { nodes, edges } } : {}),
            [newId]: newGraph,
        };
        persistSceneGraphs(updated);
        loadSceneIntoState(newId, updated);
    }, [activeSceneId, nodes, edges, sceneGraphs, scenes, persistSceneGraphs, loadSceneIntoState]);

    // ── Graph actions ───────────────────────────────────────────────────────────

    const selectNode = useCallback((id: string | null) => {
        setSelectedNodeId(id);
    }, []);

    const nodeCounter = useRef(0);
    const createNode = useCallback(
        (type: NodeType, x: number, y: number): Node<NodeParams> | null => {
            const template = NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES];
            if (!template) return null;

            const id = `node_${Date.now()}_${++nodeCounter.current}`;
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
                    params: JSON.parse(JSON.stringify(template.params)) as Record<string, unknown>,
                },
            };

            setNodes((ns) => [...ns, newNode]);
            return newNode;
        },
        [],
    );

    const duplicateNode = useCallback((id: string) => {
        setNodes((ns) => {
            const source = ns.find((n) => n.id === id);
            if (!source) return ns;

            const newId = `node_${Date.now()}_${++nodeCounter.current}`;
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
    }, []);

    const deleteNode = useCallback((id: string) => {
        setNodes((ns) => ns.filter((n) => n.id !== id));
        setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
        setSelectedNodeId(null);
    }, []);

    const renameNode = useCallback((nodeId: string, label: string) => {
        setNodes((ns) =>
            ns.map((n) => (n.id !== nodeId ? n : { ...n, data: { ...n.data, label } })),
        );
    }, []);

    const setNodeField = useCallback((nodeId: string, patch: Partial<NodeParams>) => {
        setNodes((ns) =>
            ns.map((n) => (n.id !== nodeId ? n : { ...n, data: { ...n.data, ...patch } })),
        );
    }, []);

    const updateNodeParam = useCallback((nodeId: string, key: string, value: unknown) => {
        setNodes((ns) =>
            ns.map((n) =>
                n.id !== nodeId
                    ? n
                    : { ...n, data: { ...n.data, params: { ...n.data.params, [key]: value } } },
            ),
        );
    }, []);

    // Appends a new "Reference Image N" input pin to a node (used by nodes
    // like Nano Banana that accept a variable number of reference images).
    // Capped at 14 reference images — Nano Banana's own API limit. Ids use a
    // random suffix rather than a position index: a position-based id can
    // collide with a surviving pin's id after a mid-array removal (see
    // removePinInput), and React Flow requires unique handle ids per node —
    // a collision silently breaks connections to one of the duplicate pins.
    const addImageInput = useCallback((nodeId: string) => {
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
    }, []);

    // Appends a new "Text N" input pin to a node (used by text_prompt, which
    // pairs each pin with its own wirable field — see WirableTextField usage
    // in TextParams). Same random-suffix id scheme as addImageInput above —
    // these are additionally keyed into `params` by their own id, so a
    // colliding id after a mid-array removal would also alias a surviving
    // pin's stored text. Capped like addImageInput's imageCount — excluding
    // the node's own fixed "Text" pin (index 0).
    const addTextInput = useCallback((nodeId: string) => {
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
    }, []);

    const removePinInput = useCallback((nodeId: string, portId: string) => {
        setNodes((ns) =>
            ns.map((n) =>
                n.id !== nodeId
                    ? n
                    : {
                          ...n,
                          data: { ...n.data, inputs: n.data.inputs.filter((p) => p.id !== portId) },
                      },
            ),
        );
        setEdges((es) => es.filter((e) => e.targetHandle !== portId));
    }, []);

    const updateNodeParams = useCallback((nodeId: string, patch: Record<string, unknown>) => {
        setNodes((ns) =>
            ns.map((n) =>
                n.id !== nodeId
                    ? n
                    : { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } },
            ),
        );
    }, []);

    // Single place that mutates a rich entity node's photos — keeps its
    // per-photo output pins (one per photo, id'd by blob ref) in sync with
    // the array, and prunes edges wired to any pin that no longer exists.
    const setNodePhotos = useCallback((nodeId: string, photos: string[], photoIdx: number) => {
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
                              params: { ...n.data.params, photos: capped, photoIdx },
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
    }, []);

    const graphExecution = useGraphExecution({
        nodes,
        edges,
        setNodes,
        activeSceneId,
        showToast,
        narrativeSettings,
        getSceneNarrativeSettings,
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
        removePinInput,
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
        totalDuration,
        setTotalDuration,
    };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
