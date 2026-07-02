import { useEffect, useState } from 'react'
import { edgeInput } from '../../core/graph.ts'
import { GeminiService, type GeminiModelInfo } from '../../core/services/gemini.ts'
import { WirableTextField, type EEP } from './shared.tsx'
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

export function GeminiTextParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
  const MODELS = useGeminiModels(params.model as string)
  const prompt = edgeInput(node.data, edges, resolved, 0)
  return (
    <>
      <WirableTextField
        label="Промпт"
        node={node}
        paramKey="prompt"
        params={params}
        wired={prompt.wired}
        liveValue={prompt.value}
        updateNodeParam={updateNodeParam}
      />
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

export function GeminiVisionParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
  const MODELS = useGeminiModels(params.model as string)
  const query = edgeInput(node.data, edges, resolved, 1)
  return (
    <>
      <WirableTextField
        label="Запрос к изображению"
        node={node}
        paramKey="query"
        params={params}
        wired={query.wired}
        liveValue={query.value}
        updateNodeParam={updateNodeParam}
      />
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

export function GeminiImagenParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
  const RATIOS = ['16:9', '1:1', '9:16', '4:3', '3:4']
  const prompt = edgeInput(node.data, edges, resolved, 0)
  return (
    <>
      <WirableTextField
        label="Промпт"
        node={node}
        paramKey="prompt"
        params={params}
        wired={prompt.wired}
        liveValue={prompt.value}
        updateNodeParam={updateNodeParam}
      />
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
