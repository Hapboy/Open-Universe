import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import { useToastContext } from '../../store/contexts/ToastContext.tsx'
import { MiniPlayer } from '../PlayerPanel/PlayerPanel.tsx'
import { NodeHeader } from './NodeHeader/NodeHeader.tsx'
import { NodeParamsPanel } from './NodeParams/NodeParams.tsx'
import styles from './index.module.css'

export function Inspector() {
  const {
    nodes,
    edges,
    resolved,
    selectedNodeId,
    selectNode,
    deleteNode,
    updateNodeParam,
    updateNodeParams,
    loadPinterestBoards,
    loadPinterestPins,
    executeGraph,
  } = useGraphContext()
  const { showToast } = useToastContext()

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null

  if (!node) {
    return (
      <aside className={styles.inspector} id="inspector">
        <div className={styles.inspEmpty}>
          Выбери ноду на холсте, чтобы настроить её свойства и API параметры.
        </div>
        <MiniPlayer />
      </aside>
    )
  }

  return (
    <aside className={styles.inspector} id="inspector">
      <NodeHeader
        node={node}
        onDelete={() => {
          deleteNode(node.id)
          selectNode(null)
        }}
      />
      <NodeParamsPanel
        node={node}
        edges={edges}
        resolved={resolved}
        updateNodeParam={updateNodeParam}
        updateNodeParams={updateNodeParams}
        loadPinterestBoards={loadPinterestBoards}
        loadPinterestPins={loadPinterestPins}
        executeGraph={executeGraph}
        showToast={showToast}
      />
      <MiniPlayer />
    </aside>
  )
}
