import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeTypes,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import { useToastContext } from '../../store/contexts/ToastContext.tsx'
import { NodeCard } from '../NodeCard/NodeCard.tsx'
import type { NodeParams } from '../../types.ts'
import styles from './NodeEditor.module.css'

const nodeTypes: NodeTypes = { custom: NodeCard as unknown as NodeTypes['custom'] }

function NodeEditorCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    selectNode,
    selectedNodeId,
    createNode,
    duplicateNode,
    showMiniMap,
  } = useGraphContext()
  const { showToast } = useToastContext()

  const { screenToFlowPosition } = useReactFlow()

  const copiedIdRef = useRef<string | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'c' || e.key === 'C') {
        if (selectedNodeId) copiedIdRef.current = selectedNodeId
      } else if (e.key === 'v' || e.key === 'V') {
        const id = copiedIdRef.current
        if (id && nodes.some((n) => n.id === id)) {
          e.preventDefault()
          duplicateNode(id)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedNodeId, nodes, duplicateNode])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('node-template-type')
      if (!type) return

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const node = createNode(type, position.x, position.y)
      if (node) {
        selectNode(node.id)
        if (type === 'pinterest_board') {
          showToast('Pinterest: добавляем доску...')
        }
      }
    },
    [screenToFlowPosition, createNode, selectNode, showToast]
  )

  const styledNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })),
    [nodes, selectedNodeId]
  )

  return (
    <div
      className={styles.canvasWrap}
      id="canvasWrap"
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="var(--color-border)" />
        <Controls />
        {showMiniMap && (
          <MiniMap
            nodeColor={(n) => (n.data as NodeParams).color || '#888'}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
            }}
          />
        )}
      </ReactFlow>
      <div className={styles.hint} id="hint" style={{ pointerEvents: 'none' }}>
        Перетащи ноду из палитры слева. Соедини выход одной ноды со совместимым входом другой —
        тянем от правого порта к левому.
      </div>
    </div>
  )
}

export function NodeEditor() {
  return (
    <ReactFlowProvider>
      <NodeEditorCanvas />
    </ReactFlowProvider>
  )
}
