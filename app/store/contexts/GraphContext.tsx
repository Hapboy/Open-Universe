import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
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
import type { CanonMode, NodeParams, NodeRef, Port } from '../../types.ts'
import { useToastContext } from './ToastContext.tsx'
import { readJSON, readRaw, removeKey, writeJSON, writeRaw } from '../../core/browserStorage.ts'

const SCENE_GRAPHS_KEY = 'hv_scene_graphs'
const ACTIVE_SCENE_KEY = 'hv_active_scene_id'
const NARRATIVE_SETTINGS_KEY = 'hv_narrative_settings'
const LEGACY_GRAPH_KEY = 'hv_graph'

type SceneGraphs = Record<string, { nodes: Node<NodeParams>[]; edges: Edge[] }>

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

// One-time recovery of a graph saved before scenes existed (the old single
// `hv_graph`), so upgrading to per-scene storage doesn't silently drop what
// a user already built. Never deletes `hv_graph` itself — PresetLibraryContext
// still reads it for its own legacy-preset recovery.
function recoverLegacyGraph(): { nodes: Node<NodeParams>[]; edges: Edge[] } | null {
  const parsed = readJSON<{ nodes?: unknown[]; edges?: unknown[] }>(LEGACY_GRAPH_KEY, {})
  if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) return null
  return {
    nodes: parsed.nodes as Node<NodeParams>[],
    edges: Array.isArray(parsed.edges) ? (parsed.edges as Edge[]) : [],
  }
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

function createDefaultSceneGraph(sceneId: string): { nodes: Node<NodeParams>[]; edges: Edge[] } {
  const charId = `node_char_${sceneId}`
  const locId = `node_loc_${sceneId}`
  const outId = `node_out_${sceneId}`

  const defaultLoc =
    sceneId === 'sc1'
      ? 'Севан'
      : sceneId === 'sc2'
        ? 'Дорога'
        : sceneId === 'sc3'
          ? 'Вернисаж'
          : sceneId.includes('sc4')
            ? 'Старый Конд'
            : 'Мастерская'

  const nodes: Node<NodeParams>[] = [
    {
      id: charId,
      type: 'custom',
      position: { x: 50, y: 80 },
      data: {
        nodeType: 'character',
        label: 'Персонаж',
        icon: 'ti-user',
        color: 'var(--color-node-higgsfield)',
        inputs: [{ id: `${charId}_in_0`, name: 'Clothing', type: 'any' }],
        outputs: [{ id: `${charId}_out_0`, name: 'Character Out', type: 'any' }],
        params: templateParams('character', { selectedItem: 'Ара Гехецик' }),
      },
    },
    {
      id: locId,
      type: 'custom',
      position: { x: 50, y: 260 },
      data: {
        nodeType: 'location',
        label: 'Локация',
        icon: 'ti-map-pin',
        color: 'var(--color-node-scene)',
        inputs: [],
        outputs: [{ id: `${locId}_out_0`, name: 'Location Out', type: 'any' }],
        params: templateParams('location', {
          selectedItem: defaultLoc,
          weather: 'солнце',
          timeOfDay: 'день',
        }),
      },
    },
    {
      id: outId,
      type: 'custom',
      position: { x: 420, y: 180 },
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
        params: { renderingEngine: 'Hayverse Realtime Veo 3' },
      },
    },
  ]

  const edges: Edge[] = [
    {
      id: `edge_${sceneId}_c_o`,
      source: charId,
      sourceHandle: `${charId}_out_0`,
      target: outId,
      targetHandle: `${outId}_in_0`,
    },
    {
      id: `edge_${sceneId}_l_o`,
      source: locId,
      sourceHandle: `${locId}_out_0`,
      target: outId,
      targetHandle: `${outId}_in_1`,
    },
  ]

  return { nodes, edges }
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
  let sceneGraphs = loadStoredSceneGraphs()
  if (Object.keys(sceneGraphs).length === 0) {
    const legacy = recoverLegacyGraph()
    if (legacy) sceneGraphs = { [activeSceneId]: legacy }
  }
  const activeGraph = sceneGraphs[activeSceneId] || createDefaultSceneGraph(activeSceneId)
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

export interface SceneNarrativeSettings {
  emotionalTrend: number // slope percentage (-100 to 100)
  conflictType: 'physical' | 'psychological'
  conflictTarget: 'man_vs_man' | 'man_vs_nature' | 'man_vs_society'
  storyPhase: 'exposition' | 'inciting' | 'rising' | 'climax' | 'resolution'
  tensionLevel: number // 0 to 100
  pacing: 'slow' | 'moderate' | 'fast' | 'action'
  loreRevelations: string[] // array of tags
  curveType: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out'
}

export const DEFAULT_NARRATIVE_SETTINGS: SceneNarrativeSettings = {
  emotionalTrend: 0,
  conflictType: 'physical',
  conflictTarget: 'man_vs_man',
  storyPhase: 'exposition',
  tensionLevel: 30,
  pacing: 'moderate',
  loreRevelations: [],
  curveType: 'linear',
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

  canonMode: CanonMode
  setCanonMode: (m: CanonMode) => void

  showMiniMap: boolean
  setShowMiniMap: (v: boolean) => void

  activeSceneId: string
  setActiveSceneId: (id: string) => void

  showMontageMonitor: boolean
  setShowMontageMonitor: (v: boolean) => void

  narrativeSettings: Record<string, SceneNarrativeSettings>
  updateNarrativeSettings: (sceneId: string, patch: Partial<SceneNarrativeSettings>) => void
}

const Ctx = createContext<GraphCtx>(null!)
export const useGraphContext = () => useContext(Ctx)

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToastContext()

  const [initialGraphState] = useState(loadInitialGraphState)
  const [activeSceneId, setActiveSceneIdState] = useState<string>(initialGraphState.activeSceneId)
  // Not reactive state — nothing reads it, it only exists to accumulate the
  // in-memory scene-graph cache between saves/switches, so a ref (not
  // useState) avoids forcing a re-render on every write.
  const sceneGraphsRef = useRef<SceneGraphs>(initialGraphState.sceneGraphs)

  const [nodes, setNodes] = useState<Node<NodeParams>[]>(initialGraphState.nodes)
  const [edges, setEdges] = useState<Edge[]>(initialGraphState.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [canonMode, setCanonMode] = useState<CanonMode>('canon')
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true)
  const [showMontageMonitor, setShowMontageMonitor] = useState<boolean>(false)

  const [narrativeSettings, setNarrativeSettings] = useState<
    Record<string, SceneNarrativeSettings>
  >(() => readJSON(NARRATIVE_SETTINGS_KEY, {} as Record<string, SceneNarrativeSettings>))

  const updateNarrativeSettings = useCallback(
    (sceneId: string, patch: Partial<SceneNarrativeSettings>) => {
      const base = { ...DEFAULT_NARRATIVE_SETTINGS, ...narrativeSettings[sceneId] }
      const updated = { ...narrativeSettings, [sceneId]: { ...base, ...patch } }
      writeJSON(NARRATIVE_SETTINGS_KEY, updated, () =>
        showToast('Не удалось сохранить настройки сцены (превышен лимит хранилища)')
      )
      setNarrativeSettings(updated)
    },
    [narrativeSettings, showToast]
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

  const setActiveSceneId = useCallback(
    (nextId: string) => {
      if (nextId === activeSceneId) return
      // Persist the current scene graph, then swap in the next one. State
      // setters are called directly, one after another — not from inside
      // another setState's updater function — so this stays a plain
      // synchronous sequence with no nested-updater purity concerns.
      const updated = { ...sceneGraphsRef.current, [activeSceneId]: { nodes, edges } }
      const nextGraph = updated[nextId] || createDefaultSceneGraph(nextId)
      writeJSON(SCENE_GRAPHS_KEY, updated, () =>
        showToast('Не удалось сохранить граф сцены (превышен лимит хранилища)')
      )
      writeRaw(ACTIVE_SCENE_KEY, nextId)
      sceneGraphsRef.current = updated
      setNodes(withTemplateDefaults(nextGraph.nodes))
      setEdges(nextGraph.edges)
      setSelectedNodeId(null)
      setActiveSceneIdState(nextId)
    },
    [activeSceneId, nodes, edges, showToast]
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
    if (graphSaveTimer.current) clearTimeout(graphSaveTimer.current)
    graphSaveTimer.current = setTimeout(() => {
      const updated = { ...sceneGraphsRef.current, [activeSceneId]: { nodes, edges } }
      writeJSON(SCENE_GRAPHS_KEY, updated, () =>
        showToast('Не удалось сохранить граф локально (превышен лимит хранилища)')
      )
      sceneGraphsRef.current = updated
    }, 400)
    return () => {
      if (graphSaveTimer.current) clearTimeout(graphSaveTimer.current)
    }
  }, [nodes, edges, activeSceneId, showToast])

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
    canonMode,
    setCanonMode,
    showMiniMap,
    setShowMiniMap,
    activeSceneId,
    setActiveSceneId,
    showMontageMonitor,
    setShowMontageMonitor,
    narrativeSettings,
    updateNarrativeSettings,
  }

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}
