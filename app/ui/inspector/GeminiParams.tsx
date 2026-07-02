import { useEffect, useState } from 'react'
import { GeminiService, type GeminiModelInfo } from '../../core/services/gemini.ts'
import type { EEP } from './shared.tsx'
import styles from '../../styles/shared.module.css'

const FALLBACK_MODELS: GeminiModelInfo[] = [
  { id: 'gemini-flash-latest', displayName: 'Gemini Flash (latest)' },
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
]

function useGeminiModels(currentModel: string): GeminiModelInfo[] {
  const [models, setModels] = useState<GeminiModelInfo[]>(FALLBACK_MODELS)

  useEffect(() => {
    let cancelled = false
    void GeminiService.listModels().then((list) => {
      if (!cancelled) setModels(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (currentModel && !models.some((m) => m.id === currentModel)) {
    return [{ id: currentModel, displayName: currentModel }, ...models]
  }
  return models
}

export function GeminiTextParams({ node, params, updateNodeParam }: EEP) {
  const MODELS = useGeminiModels(params.model as string)
  return (
    <>
      <div className={styles.fld}>
        <span>Промпт</span>
        <input
          type="text"
          defaultValue={params.prompt as string}
          onBlur={(e) => {
            updateNodeParam(node.id, 'prompt', e.target.value)
          }}
        />
      </div>
      <div className={styles.fld}>
        <span>Модель</span>
        <select
          value={params.model as string}
          onChange={(e) => updateNodeParam(node.id, 'model', e.target.value)}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName ?? m.id}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function GeminiVisionParams({ node, params, updateNodeParam }: EEP) {
  const MODELS = useGeminiModels(params.model as string)
  return (
    <>
      <div className={styles.fld}>
        <span>Запрос к изображению</span>
        <input
          type="text"
          defaultValue={params.query as string}
          onBlur={(e) => {
            updateNodeParam(node.id, 'query', e.target.value)
          }}
        />
      </div>
      <div className={styles.fld}>
        <span>Модель</span>
        <select
          value={params.model as string}
          onChange={(e) => updateNodeParam(node.id, 'model', e.target.value)}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName ?? m.id}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function GeminiImagenParams({ node, params, updateNodeParam }: EEP) {
  const RATIOS = ['16:9', '1:1', '9:16', '4:3', '3:4']
  return (
    <>
      <div className={styles.fld}>
        <span>Промпт</span>
        <input
          type="text"
          defaultValue={params.prompt as string}
          onBlur={(e) => {
            updateNodeParam(node.id, 'prompt', e.target.value)
          }}
        />
      </div>
      <div className={styles.fld}>
        <span>Соотношение сторон</span>
        <select
          value={params.aspectRatio as string}
          onChange={(e) => {
            updateNodeParam(node.id, 'aspectRatio', e.target.value)
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
