import styles from './CoordinateField.module.css'

export interface Coordinates {
  lat: number | null
  lon: number | null
}

function parseCoord(raw: string): number | null {
  return raw === '' ? null : Number(raw)
}

export function CoordinateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: Coordinates
  onChange: (value: Coordinates) => void
}) {
  return (
    <div className={styles.fld}>
      <span>{label}</span>
      <div className={styles.pair}>
        <input
          type="number"
          placeholder="Широта"
          min={-90}
          max={90}
          step="any"
          value={value.lat ?? ''}
          onChange={(e) => onChange({ ...value, lat: parseCoord(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Долгота"
          min={-180}
          max={180}
          step="any"
          value={value.lon ?? ''}
          onChange={(e) => onChange({ ...value, lon: parseCoord(e.target.value) })}
        />
      </div>
    </div>
  )
}
