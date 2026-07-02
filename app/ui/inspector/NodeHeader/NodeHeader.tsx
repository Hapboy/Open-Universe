import { useGraphContext } from '../../../store/contexts/GraphContext.tsx'
import type { Node } from '@xyflow/react'
import type { NodeParams } from '../../../types.ts'
import styles from './NodeHeader.module.css'

export function NodeHeader({ node, onDelete }: { node: Node<NodeParams>; onDelete: () => void }) {
  const { updateNodeParam } = useGraphContext()
  return (
    <div className={styles.inspSection}>
      <div className={styles.inspH} style={{ '--nc': node.data.color } as React.CSSProperties}>
        <i className={`ti ${node.data.icon}`} />
        <span>Свойства: {node.data.label}</span>
      </div>
      <div className={styles.fld}>
        <span>Имя ноды</span>
        <input
          type="text"
          defaultValue={node.data.label}
          onChange={(e) => updateNodeParam(node.id, 'label', e.target.value)}
        />
      </div>
      <button
        className={styles.btn}
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
