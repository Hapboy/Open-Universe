import { useState } from 'react'
import cn from 'classnames'
import type { Edge, Node } from '@xyflow/react'
import type { NodeParams } from '../../types.ts'
import styles from '../../styles/shared.module.css'

export interface NodeParamsProps {
  node: Node<NodeParams>
  edges: Edge[]
  resolved: Record<string, unknown>
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
  edges: Edge[]
  resolved: Record<string, unknown>
  updateNodeParam: NodeParamsProps['updateNodeParam']
  executeGraph: NodeParamsProps['executeGraph']
}

// Renders a "Промпт"-style field that shows a plain editable input when its
// source input pin is unwired, or a disabled input mirroring the live
// resolved value from the connected node when it's wired.
export function WirableTextField({
  label,
  node,
  paramKey,
  params,
  wired,
  liveValue,
  updateNodeParam,
}: {
  label: string
  node: Node<NodeParams>
  paramKey: string
  params: Record<string, unknown>
  wired: boolean
  liveValue: unknown
  updateNodeParam: NodeParamsProps['updateNodeParam']
}) {
  return (
    <div className={styles.fld}>
      <span>{label}</span>
      <input
        key={wired ? 'wired' : 'editable'}
        type="text"
        disabled={wired}
        {...(wired
          ? { value: (liveValue as string) ?? '' }
          : { defaultValue: params[paramKey] as string })}
        onBlur={(e) => {
          if (!wired) updateNodeParam(node.id, paramKey, e.target.value)
        }}
      />
      {wired && (
        <p className={styles.hint}>Подключено к входному пину — значение задаётся источником</p>
      )}
    </div>
  )
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
    <div className={styles.fld}>
      <span>{label}</span>
      <div className={styles.chipGroup}>
        {items.map((item) => (
          <button
            key={item}
            className={cn(styles.chip, selected === item && styles.isOn)}
            onClick={() => onSelect(item)}
          >
            {selected === item && <i className="ti ti-check" style={{ fontSize: 11 }} />} {item}
          </button>
        ))}
      </div>
    </div>
  )
}

// Dropdown over a node's `_db` list with an inline "add new item" flow:
// pick from the select, or press the add button, type a name and confirm
// with Enter / the check button (Escape cancels).
export function DatabaseSelect({
  label,
  items,
  selected,
  onSelect,
  onAdd,
  addLabel = 'Добавить',
}: {
  label: string
  items: string[]
  selected: string
  onSelect: (v: string) => void
  onAdd: (name: string) => void
  addLabel?: string
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const cancel = () => {
    setAdding(false)
    setDraft('')
  }
  const confirm = () => {
    const name = draft.trim()
    if (!name) return cancel()
    onAdd(name)
    cancel()
  }

  return (
    <div className={styles.fld}>
      <span>{label}</span>
      <select value={selected} onChange={(e) => onSelect(e.target.value)}>
        {items.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {adding ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            type="text"
            autoFocus
            placeholder="Имя нового..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm()
              if (e.key === 'Escape') cancel()
            }}
          />
          <button
            className={cn(styles.btn, styles.pri)}
            style={{ width: 'auto', flexShrink: 0 }}
            onClick={confirm}
            aria-label="Подтвердить"
          >
            <i className="ti ti-check" />
          </button>
          <button
            className={styles.btn}
            style={{ width: 'auto', flexShrink: 0 }}
            onClick={cancel}
            aria-label="Отмена"
          >
            <i className="ti ti-x" />
          </button>
        </div>
      ) : (
        <button className={styles.btn} style={{ marginTop: 6 }} onClick={() => setAdding(true)}>
          <i className="ti ti-plus" /> {addLabel}
        </button>
      )}
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
    <div className={styles.fld} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ minWidth: 60, margin: 0 }}>в кадре</span>
      <div className={styles.segBtn} style={{ width: 'auto' }}>
        <button className={value ? styles.isOn : ''} onClick={() => onChange(true)}>
          да
        </button>
        <button className={!value ? styles.isOn : ''} onClick={() => onChange(false)}>
          нет
        </button>
      </div>
    </div>
  )
}
