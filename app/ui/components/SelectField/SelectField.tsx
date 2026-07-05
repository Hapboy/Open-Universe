import styles from './SelectField.module.css'

export type SelectOption = string | { value: string; label: string }

function normalize(option: SelectOption): { value: string; label: string } {
  return typeof option === 'string' ? { value: option, label: option } : option
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  title,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  disabled?: boolean
  title?: string
}) {
  return (
    <div className={styles.fld} title={title}>
      <span>{label}</span>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(normalize).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
