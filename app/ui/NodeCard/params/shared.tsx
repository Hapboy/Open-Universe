import { useState } from 'react'
import cn from 'classnames'
import type { Edge } from '@xyflow/react'
import type { NodeRef } from '../../../types.ts'
import { usePresetLibraryContext } from '../../../store/contexts/PresetLibraryContext.tsx'
import { Switch } from '../../components/Switch/Switch.tsx'
import styles from '../../../styles/shared.module.css'

export interface NodeParamsProps {
  node: NodeRef
  edges: Edge[]
  resolved: Record<string, unknown>
  updateNodeParam: (id: string, key: string, value: unknown) => void
  updateNodeParams: (id: string, patch: Record<string, unknown>) => void
  loadPinterestBoards: (node: NodeRef) => Promise<void>
  loadPinterestPins: (node: NodeRef, boardId: string) => Promise<void>
  executeGraph: () => Promise<void>
}

export type EP<P extends Record<string, unknown>> = {
  node: NodeRef
  params: P
  updateNodeParam: NodeParamsProps['updateNodeParam']
  updateNodeParams: NodeParamsProps['updateNodeParams']
}

export type EEP = {
  node: NodeRef
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
  node: NodeRef
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

// `_presets` is bookkept here for backward compatibility: nodes loaded from
// a graph saved before presets became a shared library (see
// PresetLibraryContext.tsx) may still carry a stray `_presets` key in their
// in-memory params, and it must never be snapshotted into a new preset.
const BOOKKEEPING_KEYS = ['selectedItem', '_presets']

// Manages an entity type's shared preset library (global, one per entity
// type — see PresetLibraryContext.tsx): its keys are the dropdown's name
// list, its values are each entity's own saved params. Selecting a name loads
// its preset (if any) onto the node; adding a new name snapshots the node's
// current params (everything but the bookkeeping keys above) as that entity's
// preset. Edits made afterward stay local to the node — the shared preset
// itself is only ever rewritten by `onAdd`, and never by editing a node that
// merely has it selected.
export function usePresetDatabase(
  node: NodeRef,
  params: Record<string, unknown>,
  updateNodeParams: NodeParamsProps['updateNodeParams']
) {
  const { library, addPreset } = usePresetLibraryContext()
  const entityType = node.data.nodeType
  const presets = library[entityType] ?? {}
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
    addPreset(entityType, name, snapshot)
    updateNodeParams(node.id, { selectedItem: name })
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
  return <Switch label="в кадре" value={value} onChange={onChange} />
}
