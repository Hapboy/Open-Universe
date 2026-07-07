import styles from './TextField.module.css'

// Supports both interaction styles used across the app: fully controlled
// (`value` + `onChange`, fires every keystroke) and deferred-commit
// (`defaultValue` + `onBlur`, avoids a graph update per keystroke).
export function TextField({
  label,
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  placeholder,
  title,
}: {
  label?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onBlur?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  title?: string
}) {
  return (
    <div className={styles.fld} title={title}>
      {label && <span>{label}</span>}
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        {...(value !== undefined ? { value } : { defaultValue })}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
      />
    </div>
  )
}
