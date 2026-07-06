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

const SCENE_GRAPHS_KEY = 'hv_scene_graphs'
const ACTIVE_SCENE_KEY = 'hv_active_scene_id'

function loadStoredSceneGraphs(): Record<string, { nodes: Node<NodeParams>[]; edges: Edge[] }> {
  try {
    const raw = localStorage.getItem(SCENE_GRAPHS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, { nodes: Node<NodeParams>[]; edges: Edge[] }>

    // Defensive check: if any graph has edges pointing to non-existent nodes,
    // clear the localStorage so it heals automatically.
    let isCorrupted = false
    for (const key of Object.keys(parsed)) {
      const graph = parsed[key]
      if (graph?.nodes && graph?.edges) {
        const nodeIds = new Set(graph.nodes.map((n) => n.id))
        for (const edge of graph.edges) {
          if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
            isCorrupted = true
            break
          }
        }
      }
      if (isCorrupted) break
    }

    if (isCorrupted) {
      localStorage.removeItem(SCENE_GRAPHS_KEY)
      return {}
    }

    return parsed
  } catch {
    return {}
  }
}

function loadActiveSceneId(): string {
  return localStorage.getItem(ACTIVE_SCENE_KEY) || 'sc1'
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
        params: {
          selectedItem: 'Ара Гехецик',
          inFrame: true,
          age: 34,
          emotion: 'спокойствие',
          stylist: 'Без стилиста',
          photos: [],
          photoIdx: 0,
        },
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
        params: {
          selectedItem: defaultLoc,
          weather: 'солнце',
          timeOfDay: 'день',
          interiorExterior: 'Экстерьер',
          damageLevel: 0,
        },
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

  canonMode: CanonMode
  setCanonMode: (m: CanonMode) => void

  showMiniMap: boolean
  setShowMiniMap: (v: boolean) => void

  activeSceneId: string
  setActiveSceneId: (id: string) => void

  showMontageMonitor: boolean
  setShowMontageMonitor: (v: boolean) => void
}

const Ctx = createContext<GraphCtx>(null!)
export const useGraphContext = () => useContext(Ctx)

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToastContext()

  const [activeSceneId, setActiveSceneIdState] = useState<string>(loadActiveSceneId)
  const [, setSceneGraphs] =
    useState<Record<string, { nodes: Node<NodeParams>[]; edges: Edge[] }>>(loadStoredSceneGraphs)

  const [nodes, setNodes] = useState<Node<NodeParams>[]>(() => {
    const activeId = loadActiveSceneId()
    const graphs = loadStoredSceneGraphs()
    return graphs[activeId]?.nodes || createDefaultSceneGraph(activeId).nodes
  })
  const [edges, setEdges] = useState<Edge[]>(() => {
    const activeId = loadActiveSceneId()
    const graphs = loadStoredSceneGraphs()
    return graphs[activeId]?.edges || createDefaultSceneGraph(activeId).edges
  })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [canonMode, setCanonMode] = useState<CanonMode>('canon')
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true)
  const [showMontageMonitor, setShowMontageMonitor] = useState<boolean>(false)

  const setActiveSceneId = useCallback(
    (nextId: string) => {
      setActiveSceneIdState((prevId) => {
        // Save current graph to the old activeSceneId
        setSceneGraphs((prevGraphs) => {
          const updated = {
            ...prevGraphs,
            [prevId]: { nodes, edges },
          }
          localStorage.setItem(SCENE_GRAPHS_KEY, JSON.stringify(updated))
          return updated
        })

        // Load graph for nextId
        setSceneGraphs((prevGraphs) => {
          const nextGraph = prevGraphs[nextId] || createDefaultSceneGraph(nextId)
          setNodes(nextGraph.nodes)
          setEdges(nextGraph.edges)
          return prevGraphs
        })

        localStorage.setItem(ACTIVE_SCENE_KEY, nextId)
        return nextId
      })
    },
    [nodes, edges]
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
      try {
        setSceneGraphs((prevGraphs) => {
          const updated = {
            ...prevGraphs,
            [activeSceneId]: { nodes, edges },
          }
          localStorage.setItem(SCENE_GRAPHS_KEY, JSON.stringify(updated))
          return updated
        })
      } catch {
        showToast('Не удалось сохранить граф локально (превышен лимит хранилища)')
      }
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
  }

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}
