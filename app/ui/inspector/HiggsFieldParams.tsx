import { edgeInput } from '../../core/graph.ts'
import { HIGGSFIELD_PRESETS } from '../../data/presets.ts'
import { WirableTextField, type EEP } from './shared.tsx'
import styles from '../../styles/shared.module.css'

export function SoulParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
  const prompt = edgeInput(node.data, edges, resolved, 1)
  return (
    <>
      <WirableTextField
        label="Промпт стилизации"
        node={node}
        paramKey="prompt"
        params={params}
        wired={prompt.wired}
        liveValue={prompt.value}
        updateNodeParam={updateNodeParam}
      />
      <div className={styles.fld}>
        <span>Влияние лица (Face Weight)</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          defaultValue={params.faceWeight as number}
          onChange={(e) => updateNodeParam(node.id, 'faceWeight', parseFloat(e.target.value))}
        />
      </div>
    </>
  )
}

export function CameraParams({ node, params, updateNodeParam }: EEP) {
  return (
    <div className={styles.fld}>
      <span>Движение камеры (Пресет)</span>
      <select
        value={params.motionPreset as string}
        onChange={(e) => {
          updateNodeParam(node.id, 'motionPreset', e.target.value)
        }}
      >
        {HIGGSFIELD_PRESETS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SpeakParams({ node, params, updateNodeParam }: EEP) {
  return (
    <div className={styles.fld}>
      <span>Мимика / Липсинк Текст</span>
      <input
        type="text"
        defaultValue={params.expression as string}
        onBlur={(e) => {
          updateNodeParam(node.id, 'expression', e.target.value)
        }}
      />
    </div>
  )
}
