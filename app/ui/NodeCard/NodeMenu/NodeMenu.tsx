import { Popover } from '../../components/Popover/Popover.tsx'
import styles from './NodeMenu.module.css'

export function NodeMenu({
  onDuplicate,
  onDelete,
}: {
  onDuplicate: () => void
  onDelete: () => void
}) {
  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          className={styles.menuBtn}
          onMouseDown={(e) => e.stopPropagation()}
          title="Ещё"
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
        >
          <i className="ti ti-dots-vertical" />
        </button>
      )}
    >
      {(close) => (
        <div className={styles.menu} onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              onDuplicate()
              close()
            }}
          >
            <i className="ti ti-copy" /> Дублировать
          </button>
          <button
            className={styles.danger}
            onClick={() => {
              onDelete()
              close()
            }}
          >
            <i className="ti ti-trash" /> Удалить
          </button>
        </div>
      )}
    </Popover>
  )
}
