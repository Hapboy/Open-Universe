import { HIGGSFIELD_PRESETS } from '../../data/presets.ts'
import type { EEP } from './shared.tsx'

export function SoulParams({ node, params, updateNodeParam, executeGraph }: EEP) {
  return (
    <>
      <div className="fld">
        <span>Промпт стилизации</span>
        <input
          type="text"
          defaultValue={params.prompt as string}
          onBlur={(e) => {
            updateNodeParam(node.id, 'prompt', e.target.value)
            void executeGraph()
          }}
        />
      </div>
      <div className="fld">
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

export function CameraParams({ node, params, updateNodeParam, executeGraph }: EEP) {
  return (
    <div className="fld">
      <span>Движение камеры (Пресет)</span>
      <select
        value={params.motionPreset as string}
        onChange={(e) => {
          updateNodeParam(node.id, 'motionPreset', e.target.value)
          void executeGraph()
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

export function SpeakParams({ node, params, updateNodeParam, executeGraph }: EEP) {
  return (
    <div className="fld">
      <span>Мимика / Липсинк Текст</span>
      <input
        type="text"
        defaultValue={params.expression as string}
        onBlur={(e) => {
          updateNodeParam(node.id, 'expression', e.target.value)
          void executeGraph()
        }}
      />
    </div>
  )
}
