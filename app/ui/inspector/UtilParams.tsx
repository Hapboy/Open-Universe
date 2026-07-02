import type { EEP } from './shared.tsx'
import styles from '../../styles/shared.module.css'

export function OutputParams({ node, params, updateNodeParam }: EEP) {
  const ENGINES = ['Hayverse Realtime Veo 3', 'Hayverse Draft', 'Hayverse Cinema 4K']
  return (
    <>
      <div className={styles.fld}>
        <span>Рендер-движок</span>
        <select
          value={params.renderingEngine as string}
          onChange={(e) => {
            updateNodeParam(node.id, 'renderingEngine', e.target.value)
          }}
        >
          {ENGINES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function TextParams({ node, params, updateNodeParam }: EEP) {
  return (
    <div className={styles.fld}>
      <span>Текстовое значение</span>
      <input
        type="text"
        defaultValue={params.text as string}
        onBlur={(e) => {
          updateNodeParam(node.id, 'text', e.target.value)
        }}
      />
    </div>
  )
}
