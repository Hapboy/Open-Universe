import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
} from '@xyflow/react'
import { NODE_TEMPLATES } from '../../data/nodes.ts'
import type { NodeParams, NodeRef, Port, TimelineScene } from '../../types.ts'
import { useToastContext } from './ToastContext.tsx'
import { readJSON, readRaw, removeKey, writeJSON, writeRaw } from '../../core/browserStorage.ts'

const SCENE_GRAPHS_KEY = 'hv_scene_graphs'
const ACTIVE_SCENE_KEY = 'hv_active_scene_id'
const TIMELINE_DURATION_KEY = 'hv_timeline_duration'
const DEFAULT_TOTAL_DURATION = 872 // 14:32 in seconds

type SceneGraphs = Record<string, { nodes: Node<NodeParams>[]; edges: Edge[] }>

function loadStoredTotalDuration(): number {
  const raw = readRaw(TIMELINE_DURATION_KEY)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOTAL_DURATION
}

// A stored scene graph is corrupted if any edge points at a node id that no
// longer exists in that same scene's node list.
function isValidSceneGraphs(value: unknown): value is SceneGraphs {
  if (!value || typeof value !== 'object') return false
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const graph = (value as Record<string, { nodes?: unknown; edges?: unknown }>)[key]
    if (graph?.nodes && graph?.edges) {
      const nodeIds = new Set((graph.nodes as { id?: string }[]).map((n) => n?.id).filter(Boolean))
      for (const edge of graph.edges as { source?: string; target?: string }[]) {
        if (!edge || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return false
      }
    }
  }
  return true
}

function loadStoredSceneGraphs(): SceneGraphs {
  return readJSON(SCENE_GRAPHS_KEY, {} as SceneGraphs, isValidSceneGraphs, () =>
    removeKey(SCENE_GRAPHS_KEY)
  )
}

// A pure read: the URL param is honored immediately for the initial render,
// but persisting it is the mount effect's job (see "Clean query parameter"
// below) — this function has no side effects, so it's safe to call from a
// lazy initializer.
function loadActiveSceneId(): string {
  if (typeof window !== 'undefined') {
    const sceneParam = new URLSearchParams(window.location.search).get('scene')
    if (sceneParam) return sceneParam
  }
  return readRaw(ACTIVE_SCENE_KEY) || 'sc1'
}

// Params from the node template, deep-cloned, with overrides on top.
function templateParams(type: string, overrides: Record<string, unknown> = {}) {
  if (!type) return overrides || {}
  const template = NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES]
  const base = template
    ? (JSON.parse(JSON.stringify(template.params)) as Record<string, unknown>)
    : {}
  return { ...base, ...(overrides || {}) }
}

// Stored graphs may predate params added to templates later (e.g. character
// coordinates) — merge template defaults under stored params so param editors
// never receive undefined and a missing field can't crash the tree.
function withTemplateDefaults(nodes: Node<NodeParams>[]): Node<NodeParams>[] {
  if (!Array.isArray(nodes)) return []
  return nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      params: templateParams(n?.data?.nodeType, n?.data?.params),
    },
  }))
}

// A brand-new scene's graph is just its output node — no character/location
// starter nodes. Used both for "Add Scene" and the very-first-run bootstrap.
function createEmptySceneGraph(
  sceneId: string,
  overrides: { title?: string; start?: number } = {}
): { nodes: Node<NodeParams>[]; edges: Edge[] } {
  const outId = `node_out_${sceneId}`

  const nodes: Node<NodeParams>[] = [
    {
      id: outId,
      type: 'custom',
      position: { x: 200, y: 150 },
      data: {
        nodeType: 'output_scene',
        label: 'Выходная Сцена',
        icon: 'ti-movie',
        color: 'var(--color-node-scene)',
        inputs: [
          { id: `${outId}_in_0`, name: 'Visual Render', type: 'Image' },
          { id: `${outId}_in_1`, name: 'Motion Render', type: 'Video' },
        ],
        outputs: [],
        params: templateParams('output_scene', overrides),
      },
    },
  ]

  return { nodes, edges: [] }
}

// Builds the Timeline's scene list straight from each scene's `output_scene`
// node params — a scene with no such node (deleted, or never had one) simply
// doesn't count. Sorted by `start`; `num` is a display label, not stored.
function deriveScenes(graphs: SceneGraphs): TimelineScene[] {
  const list: Omit<TimelineScene, 'num'>[] = []
  for (const [sceneId, graph] of Object.entries(graphs)) {
    const outNode = graph.nodes.find((n) => n.data?.nodeType === 'output_scene')
    if (!outNode) continue
    const p = outNode.data.params as Record<string, unknown>
    list.push({
      id: sceneId,
      title: (p.title as string) ?? '',
      start: (p.start as number) ?? 0,
      duration: (p.duration as number) ?? 0,
      track: (p.track as number) === 2 ? 2 : 1,
      coverUrl: (p.coverUrl as string) ?? '',
      cameraActive: true,
    })
  }
  list.sort((a, b) => a.start - b.start)
  return list.map((s, i) => ({ ...s, num: String(i + 1).padStart(2, '0') }))
}

interface InitialGraphState {
  activeSceneId: string
  sceneGraphs: SceneGraphs
  nodes: Node<NodeParams>[]
  edges: Edge[]
}

// Parses localStorage exactly once for the initial render (the old code read
// `loadActiveSceneId`/`loadStoredSceneGraphs` independently up to 3 times on
// mount — once per lazy initializer — each re-parsing the same blob).
function loadInitialGraphState(): InitialGraphState {
  const activeSceneId = loadActiveSceneId()
  const sceneGraphs = loadStoredSceneGraphs()
  const activeGraph = sceneGraphs[activeSceneId] || createEmptySceneGraph(activeSceneId)
  return {
    activeSceneId,
    sceneGraphs,
    nodes: withTemplateDefaults(activeGraph.nodes),
    edges: activeGraph.edges,
  }
}

function findPort(
  nodes: Node<NodeParams>[],
  nodeId: string | null | undefined,
  handleId: string | null | undefined,
  direction: 'source' | 'target'
): Port | undefined {
  const node = nodes.find((n) => n.id === nodeId)
  const ports = direction === 'source' ? node?.data.outputs : node?.data.inputs
  return ports?.find((p) => p.id === handleId)
}

interface GraphCtx {
  nodes: Node<NodeParams>[]
  edges: Edge[]
  resolved: Record<string, unknown>
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  isValidConnection: IsValidConnection

  selectedNodeId: string | null
  selectNode: (id: string | null) => void

  createNode: (type: string, x: number, y: number) => Node<NodeParams> | null
  duplicateNode: (id: string) => void
  deleteNode: (id: string) => void
  renameNode: (nodeId: string, label: string) => void
  updateNodeParam: (nodeId: string, key: string, value: unknown) => void
  updateNodeParams: (nodeId: string, patch: Record<string, unknown>) => void
  executeGraph: () => Promise<void>
  runNode: (nodeId: string) => Promise<void>
  runningNodeIds: Set<string>
  loadPinterestBoards: (node: NodeRef) => Promise<void>
  loadPinterestPins: (node: NodeRef, boardId: string) => Promise<void>

  showMiniMap: boolean
  setShowMiniMap: (v: boolean) => void

  activeSceneId: string | null
  setActiveSceneId: (id: string) => void

  scenes: TimelineScene[]
  createScene: () => void

  showMontageMonitor: boolean
  setShowMontageMonitor: (v: boolean) => void

  showWorldMap: boolean
  setShowWorldMap: (v: boolean) => void

  totalDuration: number
  setTotalDuration: (seconds: number) => void
}

const Ctx = createContext<GraphCtx>(null!)
export const useGraphContext = () => useContext(Ctx)

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToastContext()

  const [initialGraphState] = useState(loadInitialGraphState)
  const [activeSceneId, setActiveSceneIdState] = useState<string | null>(
    initialGraphState.activeSceneId
  )
  const [sceneGraphs, setSceneGraphs] = useState<SceneGraphs>(initialGraphState.sceneGraphs)

  const [nodes, setNodes] = useState<Node<NodeParams>[]>(initialGraphState.nodes)
  const [edges, setEdges] = useState<Edge[]>(initialGraphState.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true)
  const [showMontageMonitor, setShowMontageMonitor] = useState<boolean>(false)
  const [showWorldMap, setShowWorldMap] = useState<boolean>(false)

  const [totalDuration, setTotalDurationState] = useState<number>(loadStoredTotalDuration)
  const setTotalDuration = useCallback(
    (seconds: number) => {
      const clamped = Math.max(1, Math.round(seconds))
      setTotalDurationState(clamped)
      writeRaw(TIMELINE_DURATION_KEY, String(clamped), () =>
        showToast('Не удалось сохранить длительность фильма (превышен лимит хранилища)')
      )
    },
    [showToast]
  )

  // Clean query parameter from URL bar on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('scene')) {
      const newUrl =
        window.location.protocol + '//' + window.location.host + window.location.pathname
      window.history.replaceState({ path: newUrl }, '', newUrl)
    }
  }, [])

  const persistSceneGraphs = useCallback(
    (updated: SceneGraphs) => {
      writeJSON(SCENE_GRAPHS_KEY, updated, () =>
        showToast('Не удалось сохранить граф сцены (превышен лимит хранилища)')
      )
      setSceneGraphs(updated)
    },
    [showToast]
  )

  // Loads a scene's graph into the live editor state (or clears the canvas
  // when `nextId` is null, i.e. no scenes remain).
  const loadSceneIntoState = useCallback((nextId: string | null, graphs: SceneGraphs) => {
    if (nextId) {
      const nextGraph = graphs[nextId] || createEmptySceneGraph(nextId)
      setNodes(withTemplateDefaults(nextGraph.nodes))
      setEdges(nextGraph.edges)
      writeRaw(ACTIVE_SCENE_KEY, nextId)
    } else {
      setNodes([])
      setEdges([])
      removeKey(ACTIVE_SCENE_KEY)
    }
    setSelectedNodeId(null)
    setActiveSceneIdState(nextId)
  }, [])

  const setActiveSceneId = useCallback(
    (nextId: string) => {
      if (nextId === activeSceneId) return
      // Persist the current scene graph, then swap in the next one. State
      // setters are called directly, one after another — not from inside
      // another setState's updater function — so this stays a plain
      // synchronous sequence with no nested-updater purity concerns.
      const updated = activeSceneId
        ? { ...sceneGraphs, [activeSceneId]: { nodes, edges } }
        : sceneGraphs
      persistSceneGraphs(updated)
      loadSceneIntoState(nextId, updated)
    },
    [activeSceneId, nodes, edges, sceneGraphs, persistSceneGraphs, loadSceneIntoState]
  )

  // ── React Flow handlers ─────────────────────────────────────────────────────

  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns) as Node<NodeParams>[])
  }, [])

  const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((es) => applyEdgeChanges(changes, es))
  }, [])

  const onConnect: OnConnect = useCallback((conn: Connection) => {
    setEdges((es) => addEdge(conn, es))
  }, [])

  const isValidConnection: IsValidConnection = useCallback(
    (conn) => {
      const sourcePort = findPort(nodes, conn.source, conn.sourceHandle, 'source')
      const targetPort = findPort(nodes, conn.target, conn.targetHandle, 'target')
      if (!sourcePort || !targetPort) return false
      if (sourcePort.type === 'any' || targetPort.type === 'any') return true
      return sourcePort.type === targetPort.type
    },
    [nodes]
  )

  // ── Graph persistence (temp localStorage autosave; will move to a backend) ──

  const graphSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!activeSceneId) return
    if (graphSaveTimer.current) clearTimeout(graphSaveTimer.current)
    graphSaveTimer.current = setTimeout(() => {
      // Deliberately reads `sceneGraphs` via closure without listing it as a
      // dependency below: every code path that changes the map (switching,
      // adding, or cascade-removing a scene) also changes activeSceneId or
      // nodes/edges, which already re-creates this effect with a fresh
      // closure — adding `sceneGraphs` itself would re-arm this timer on
      // every save, since saving is exactly what changes it.
      persistSceneGraphs({ ...sceneGraphs, [activeSceneId]: { nodes, edges } })
    }, 400)
    return () => {
      if (graphSaveTimer.current) clearTimeout(graphSaveTimer.current)
    }
  }, [nodes, edges, activeSceneId, persistSceneGraphs])

  // ── Scene list (derived from each scene's output_scene node) ────────────────

  // Merges the *live*, not-yet-debounce-saved active scene on top of the
  // saved snapshot of every other scene, so editing a scene's params (title,
  // start, cover...) updates the Timeline immediately.
  const mergedGraphsForDerivation = useMemo(
    () => (activeSceneId ? { ...sceneGraphs, [activeSceneId]: { nodes, edges } } : sceneGraphs),
    [sceneGraphs, activeSceneId, nodes, edges]
  )
  const scenes = useMemo(() => deriveScenes(mergedGraphsForDerivation), [mergedGraphsForDerivation])

  // Cascade-delete: if the active scene's `output_scene` node disappears —
  // whether via the NodeCard menu's `deleteNode` or React Flow's built-in
  // `Delete`-key path (which bypasses `deleteNode` entirely, see
  // NodeEditor.tsx's `deleteKeyCode` prop) — remove the whole scene and
  // switch to whichever remaining scene starts earliest (or clear the
  // canvas if none remain). Only the active scene's graph is ever editable
  // from the canvas, so watching `nodes` here is sufficient.
  const prevSceneIdRef = useRef<string | null>(initialGraphState.activeSceneId)
  const prevHadOutputRef = useRef<boolean>(
    initialGraphState.nodes.some((n) => n.data.nodeType === 'output_scene')
  )
  useEffect(() => {
    if (prevSceneIdRef.current !== activeSceneId) {
      prevSceneIdRef.current = activeSceneId
      prevHadOutputRef.current = activeSceneId
        ? nodes.some((n) => n.data.nodeType === 'output_scene')
        : false
      return
    }

    const hasOutputNow = nodes.some((n) => n.data.nodeType === 'output_scene')
    if (activeSceneId && prevHadOutputRef.current && !hasOutputNow) {
      const updated = { ...sceneGraphs }
      delete updated[activeSceneId]
      persistSceneGraphs(updated)
      const remaining = deriveScenes(updated) // sorted by start ascending
      loadSceneIntoState(remaining[0]?.id ?? null, updated)
    }
    prevHadOutputRef.current = hasOutputNow
  }, [nodes, activeSceneId, sceneGraphs, persistSceneGraphs, loadSceneIntoState])

  const createScene = useCallback(() => {
    const idPool = new Set([...Object.keys(sceneGraphs), ...(activeSceneId ? [activeSceneId] : [])])
    let maxN = 0
    idPool.forEach((id) => {
      const m = /^sc(\d+)$/.exec(id)
      if (m) maxN = Math.max(maxN, Number(m[1]))
    })
    const newId = `sc${maxN + 1}`

    // New scenes always default to track 1 — chain after track 1's last scene
    // specifically, not the global end across both tracks, so consecutive
    // adds never accidentally overlap a scene sitting on track 2.
    const track1Scenes = scenes.filter((s) => s.track === 1)
    const start = track1Scenes.length
      ? Math.max(...track1Scenes.map((s) => s.start + s.duration))
      : 0
    const newGraph = createEmptySceneGraph(newId, { title: `Сцена ${maxN + 1}`, start })

    const updated = {
      ...sceneGraphs,
      ...(activeSceneId ? { [activeSceneId]: { nodes, edges } } : {}),
      [newId]: newGraph,
    }
    persistSceneGraphs(updated)
    loadSceneIntoState(newId, updated)
  }, [activeSceneId, nodes, edges, sceneGraphs, scenes, persistSceneGraphs, loadSceneIntoState])

  // ── Graph actions ───────────────────────────────────────────────────────────

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id)
  }, [])

  const nodeCounter = useRef(0)
  const createNode = useCallback((type: string, x: number, y: number): Node<NodeParams> | null => {
    const template = NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES]
    if (!template) return null

    const id = `node_${Date.now()}_${++nodeCounter.current}`
    const newNode: Node<NodeParams> = {
      id,
      type: 'custom',
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
    }

    setNodes((ns) => [...ns, newNode])
    return newNode
  }, [])

  const duplicateNode = useCallback((id: string) => {
    setNodes((ns) => {
      const source = ns.find((n) => n.id === id)
      if (!source) return ns

      const newId = `node_${Date.now()}_${++nodeCounter.current}`
      const duplicated: Node<NodeParams> = {
        ...source,
        id: newId,
        position: { x: source.position.x + 40, y: source.position.y + 40 },
        data: {
          ...structuredClone(source.data),
          inputs: source.data.inputs.map((inp, i) => ({ ...inp, id: `${newId}_in_${i}` })),
          outputs: source.data.outputs.map((out, i) => ({ ...out, id: `${newId}_out_${i}` })),
        },
        selected: false,
      }

      setSelectedNodeId(newId)
      return [...ns, duplicated]
    })
  }, [])

  const deleteNode = useCallback((id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id))
    setSelectedNodeId(null)
  }, [])

  const renameNode = useCallback((nodeId: string, label: string) => {
    setNodes((ns) => ns.map((n) => (n.id !== nodeId ? n : { ...n, data: { ...n.data, label } })))
  }, [])

  const updateNodeParam = useCallback((nodeId: string, key: string, value: unknown) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id !== nodeId
          ? n
          : { ...n, data: { ...n.data, params: { ...n.data.params, [key]: value } } }
      )
    )
  }, [])

  const updateNodeParams = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id !== nodeId ? n : { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } }
      )
    )
  }, [])

  const loadPinterestBoards = useCallback(
    async (node: NodeRef) => {
      const { PinterestService } = await import('../../core/services/index.ts')
      const boards = await PinterestService.fetchBoards(showToast)
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== node.id) return n
          const params: Record<string, unknown> = { ...n.data.params, boards }
          if (boards.length && !params.boardId) {
            params.boardId = (boards[0] as { id: string }).id
            params.boardName = (boards[0] as { name: string }).name
          }
          return { ...n, data: { ...n.data, params } }
        })
      )
    },
    [showToast]
  )

  const loadPinterestPins = useCallback(async (node: NodeRef, boardId: string) => {
    const { PinterestService } = await import('../../core/services/index.ts')
    const pins = await PinterestService.fetchPins(boardId)
    const selectedPin = pins.length
      ? (pins[0] as { image: string }).image
      : node.data.params.selectedPin
    setNodes((ns) =>
      ns.map((n) =>
        n.id !== node.id
          ? n
          : { ...n, data: { ...n.data, params: { ...n.data.params, pins, selectedPin } } }
      )
    )
  }, [])

  const resolvedRef = useRef<Record<string, unknown>>({})
  const [resolved, setResolved] = useState<Record<string, unknown>>({})
  const [runningNodeIds, setRunningNodeIds] = useState<Set<string>>(new Set())

  const executeGraph = useCallback(async () => {
    const { runGraph } = await import('../../core/graph.ts')
    resolvedRef.current = {}
    await runGraph(nodes, edges, resolvedRef.current, showToast, (img: string | null) => {
      ;(window as Window & { customRenderImage?: string | null }).customRenderImage = img
    })
    setResolved({ ...resolvedRef.current })
  }, [nodes, edges, showToast])

  const runNode = useCallback(
    async (nodeId: string) => {
      const { runNodeCascade } = await import('../../core/graph.ts')
      await runNodeCascade(
        nodeId,
        nodes,
        edges,
        resolvedRef.current,
        showToast,
        (img: string | null) => {
          ;(window as Window & { customRenderImage?: string | null }).customRenderImage = img
        },
        (id) => setRunningNodeIds((s) => new Set(s).add(id)),
        (id) => {
          setRunningNodeIds((s) => {
            const next = new Set(s)
            next.delete(id)
            return next
          })
          setResolved({ ...resolvedRef.current })
        }
      )
    },
    [nodes, edges, showToast]
  )

  // ── Assemble and expose ─────────────────────────────────────────────────────

  const ctx: GraphCtx = {
    nodes,
    edges,
    resolved,
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
    updateNodeParam,
    updateNodeParams,
    executeGraph,
    runNode,
    runningNodeIds,
    loadPinterestBoards,
    loadPinterestPins,
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
    totalDuration,
    setTotalDuration,
  }

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}
