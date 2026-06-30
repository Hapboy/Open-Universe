import type { Node } from '@xyflow/react'
import type { NodeParams } from '../../types.ts'

export interface NodeParamsProps {
  node: Node<NodeParams>
  updateNodeParam: (id: string, key: string, value: unknown) => void
  loadPinterestBoards: (node: Node<NodeParams>) => Promise<void>
  loadPinterestPins: (node: Node<NodeParams>, boardId: string) => Promise<void>
  executeGraph: () => Promise<void>
  showToast: (msg: string) => void
}

export type EP<P extends Record<string, unknown>> = {
  node: Node<NodeParams>
  params: P
  updateNodeParam: NodeParamsProps['updateNodeParam']
}

export type EEP = {
  node: Node<NodeParams>
  params: Record<string, unknown>
  updateNodeParam: NodeParamsProps['updateNodeParam']
  executeGraph: NodeParamsProps['executeGraph']
}

export function DatabaseChips({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string
  items: string[]
  selected: string
  onSelect: (v: string) => void
}) {
  return (
    <div className="fld">
      <span>{label}</span>
      <div className="chip-group">
        {items.map((item) => (
          <button
            key={item}
            className={`chip${selected === item ? ' on' : ''}`}
            onClick={() => onSelect(item)}
          >
            {selected === item && <i className="ti ti-check" style={{ fontSize: 11 }} />} {item}
          </button>
        ))}
      </div>
    </div>
  )
}

export function InFrameToggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="fld" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ minWidth: 60, margin: 0 }}>в кадре</span>
      <div className="seg-btn" style={{ width: 'auto' }}>
        <button className={value ? 'on' : ''} onClick={() => onChange(true)}>
          да
        </button>
        <button className={!value ? 'on' : ''} onClick={() => onChange(false)}>
          нет
        </button>
      </div>
    </div>
  )
}
