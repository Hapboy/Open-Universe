import { useAppContext } from '../../store/AppContext.tsx'
import { MiniPlayer } from '../PlayerPanel.tsx'
import { NodeHeader } from './NodeHeader.tsx'
import { NodeParamsPanel } from './NodeParams.tsx'

export function Inspector() {
  const {
    nodes,
    selectedNodeId,
    selectNode,
    deleteNode,
    updateNodeParam,
    loadPinterestBoards,
    loadPinterestPins,
    executeGraph,
    showToast,
  } = useAppContext()

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null

  if (!node) {
    return (
      <aside className="inspector" id="inspector">
        <div className="insp-empty">
          Выбери ноду на холсте, чтобы настроить её свойства и API параметры.
        </div>
        <MiniPlayer />
      </aside>
    )
  }

  return (
    <aside className="inspector" id="inspector">
      <NodeHeader
        node={node}
        onDelete={() => {
          deleteNode(node.id)
          selectNode(null)
        }}
      />
      <NodeParamsPanel
        node={node}
        updateNodeParam={updateNodeParam}
        loadPinterestBoards={loadPinterestBoards}
        loadPinterestPins={loadPinterestPins}
        executeGraph={executeGraph}
        showToast={showToast}
      />
      <MiniPlayer />
    </aside>
  )
}
