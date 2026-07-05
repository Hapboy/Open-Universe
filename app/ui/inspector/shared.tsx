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
  updateNodeParams: (id: string, patch: Record<string, unknown>) => void
  loadPinterestBoards: (node: Node<NodeParams>) => Promise<void>
  loadPinterestPins: (node: Node<NodeParams>, boardId: string) => Promise<void>
  executeGraph: () => Promise<void>
  showToast: (msg: string) => void
}

export type EP<P extends Record<string, unknown>> = {
  node: Node<NodeParams>
  params: P
  updateNodeParam: NodeParamsProps['updateNodeParam']
  updateNodeParams: NodeParamsProps['updateNodeParams']
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

const BOOKKEEPING_KEYS = ['selectedItem', '_presets']

// Manages an entity node's `_presets` map: its keys are the dropdown's name
// list, its values are each entity's own saved params. Selecting a name loads
// its preset (if any) onto the node; adding a new name snapshots the node's
// current params (everything but the bookkeeping keys above) as that entity's
// preset. Edits made afterward stay local to the node — the preset itself is
// only ever rewritten by `onAdd`.
export function usePresetDatabase(
  node: Node<NodeParams>,
  params: Record<string, unknown>,
  updateNodeParams: NodeParamsProps['updateNodeParams']
) {
  const presets = (params._presets as Record<string, Record<string, unknown>>) || {}
  const db = Object.keys(presets)

  const onSelect = (name: string) => {
    updateNodeParams(node.id, { selectedItem: name, ...(presets[name] ?? {}) })
  }

  const onAdd = (name: string) => {
    const existing = db.find((c) => c.toLowerCase() === name.toLowerCase())
    if (existing) return onSelect(existing)
    const snapshot = Object.fromEntries(
      Object.entries(params).filter(([k]) => !BOOKKEEPING_KEYS.includes(k))
    )
    updateNodeParams(node.id, {
      _presets: { ...presets, [name]: snapshot },
      selectedItem: name,
    })
  }

  return { db, onSelect, onAdd }
}

// Dropdown over a name list with an inline "add new item" flow: pick from
// the select, or press the add button, type a name and confirm with Enter /
// the check button (Escape cancels).
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
