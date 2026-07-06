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

const GRAPH_STORAGE_KEY = 'hv_graph'

function loadStoredGraph(): { nodes: Node<NodeParams>[]; edges: Edge[] } {
  try {
    const raw = localStorage.getItem(GRAPH_STORAGE_KEY)
    if (!raw) return { nodes: [], edges: [] }
    const parsed = JSON.parse(raw)
    return { nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] }
  } catch {
    return { nodes: [], edges: [] }
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
}

const Ctx = createContext<GraphCtx>(null!)
export const useGraphContext = () => useContext(Ctx)

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToastContext()

  const [nodes, setNodes] = useState<Node<NodeParams>[]>(() => loadStoredGraph().nodes)
  const [edges, setEdges] = useState<Edge[]>(() => loadStoredGraph().edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [canonMode, setCanonMode] = useState<CanonMode>('canon')

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
        localStorage.setItem(GRAPH_STORAGE_KEY, JSON.stringify({ nodes, edges }))
      } catch {
        showToast('Не удалось сохранить граф локально (превышен лимит хранилища)')
      }
    }, 400)
    return () => {
      if (graphSaveTimer.current) clearTimeout(graphSaveTimer.current)
    }
  }, [nodes, edges, showToast])

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
  }

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}
