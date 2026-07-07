import { useState } from 'react'
import { formatTime } from '../timelineUtils.ts'
import styles from './DurationEditor.module.css'

// Click-to-edit, mirroring DatabaseSelect's inline-edit interaction pattern
// (app/ui/NodeCard/params/shared.tsx): click to reveal an input, Enter/blur
// commits, Escape cancels.
export function DurationEditor({
  totalDuration,
  onChange,
}: {
  totalDuration: number
  onChange: (seconds: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const start = () => {
    setDraft(String(totalDuration))
    setEditing(true)
  }

  const cancel = () => setEditing(false)

  const confirm = () => {
    const seconds = Number(draft)
    if (Number.isFinite(seconds) && seconds > 0) onChange(seconds)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span className={styles.display} onClick={start} title="Изменить длительность фильма">
        {formatTime(totalDuration)}
      </span>
    )
  }

  return (
    <span className={styles.editRow}>
      <input
        type="number"
        min={1}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm()
          if (e.key === 'Escape') cancel()
        }}
        onBlur={confirm}
      />
      <span>сек</span>
    </span>
  )
}
