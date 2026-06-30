import type { EEP } from './shared.tsx'

export function GeminiTextParams({ node, params, updateNodeParam, executeGraph }: EEP) {
  const MODELS = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-2.5-flash']
  return (
    <>
      <div className="fld">
        <span>Промпт</span>
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
        <span>Модель</span>
        <select
          value={params.model as string}
          onChange={(e) => updateNodeParam(node.id, 'model', e.target.value)}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function GeminiVisionParams({ node, params, updateNodeParam, executeGraph }: EEP) {
  const MODELS = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-2.5-flash']
  return (
    <>
      <div className="fld">
        <span>Запрос к изображению</span>
        <input
          type="text"
          defaultValue={params.query as string}
          onBlur={(e) => {
            updateNodeParam(node.id, 'query', e.target.value)
            void executeGraph()
          }}
        />
      </div>
      <div className="fld">
        <span>Модель</span>
        <select
          value={params.model as string}
          onChange={(e) => updateNodeParam(node.id, 'model', e.target.value)}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function GeminiImagenParams({ node, params, updateNodeParam, executeGraph }: EEP) {
  const RATIOS = ['16:9', '1:1', '9:16', '4:3', '3:4']
  return (
    <>
      <div className="fld">
        <span>Промпт</span>
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
        <span>Соотношение сторон</span>
        <select
          value={params.aspectRatio as string}
          onChange={(e) => {
            updateNodeParam(node.id, 'aspectRatio', e.target.value)
            void executeGraph()
          }}
        >
          {RATIOS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
