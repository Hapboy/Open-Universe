import { useAppContext } from '../../store/AppContext.tsx'
import type { Node } from '@xyflow/react'
import type { NodeParams } from '../../types.ts'

export function NodeHeader({ node, onDelete }: { node: Node<NodeParams>; onDelete: () => void }) {
  const { updateNodeParam } = useAppContext()
  return (
    <div className="insp-section">
      <div className="insp-h" style={{ '--nc': node.data.color } as React.CSSProperties}>
        <i className={`ti ${node.data.icon}`} />
        <span>Свойства: {node.data.label}</span>
      </div>
      <div className="fld">
        <span>Имя ноды</span>
        <input
          type="text"
          defaultValue={node.data.label}
          onChange={(e) => updateNodeParam(node.id, 'label', e.target.value)}
        />
      </div>
      <button
        className="btn"
        onClick={onDelete}
        style={{
          color: 'var(--color-text-danger)',
          borderColor: 'var(--color-text-danger)',
          marginTop: 6,
        }}
      >
        <i className="ti ti-trash" /> Удалить ноду
      </button>
    </div>
  )
}
