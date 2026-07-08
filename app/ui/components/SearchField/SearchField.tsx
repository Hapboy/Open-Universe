import { TextField } from '../TextField/TextField.tsx'
import styles from './SearchField.module.css'

export function SearchField({
  value,
  onChange,
  placeholder = 'Поиск параметров...',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className={styles.wrap}>
      <i className={`ti ti-search ${styles.searchIcon}`} />
      <TextField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={styles.searchInput}
      />
      {value && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => onChange('')}
          aria-label="Очистить поиск"
          title="Очистить поиск"
        >
          <i className="ti ti-x" />
        </button>
      )}
    </div>
  )
}
