import cn from 'classnames'
import { TextField } from '../TextField/TextField.tsx'
import styles from './SearchField.module.css'

export function SearchField({
  value,
  onChange,
  placeholder = 'Поиск параметров...',
  autoFocus,
  variant = 'boxed',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  variant?: 'boxed' | 'flush'
}) {
  return (
    <div className={cn(styles.wrap, variant === 'flush' && styles.flush)}>
      <i className={`ti ti-search ${styles.searchIcon}`} />
      <TextField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={styles.searchInput}
        autoFocus={autoFocus}
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
