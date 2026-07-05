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

const IMAGEN_MODELS: GeminiModelInfo[] = [
  { id: 'imagen-4.0-generate-001', displayName: 'Imagen 4' },
  { id: 'imagen-4.0-ultra-generate-001', displayName: 'Imagen 4 Ultra' },
  { id: 'imagen-4.0-fast-generate-001', displayName: 'Imagen 4 Fast' },
]

const PERSON_GENERATION_OPTIONS = [
  { id: 'DONT_ALLOW', label: 'Запрещено' },
  { id: 'ALLOW_ADULT', label: 'Только взрослые' },
  { id: 'ALLOW_ALL', label: 'Все' },
]

const SAFETY_FILTER_OPTIONS = [
  'BLOCK_LOW_AND_ABOVE',
  'BLOCK_MEDIUM_AND_ABOVE',
  'BLOCK_ONLY_HIGH',
  'BLOCK_NONE',
]

const OUTPUT_MIME_OPTIONS = [
  { id: 'image/png', label: 'PNG' },
  { id: 'image/jpeg', label: 'JPEG' },
]

const LANGUAGE_OPTIONS = ['auto', 'en', 'ja', 'ko', 'hi', 'zh', 'pt', 'es']

// Vertex AI "Enterprise" mode is required for these fields, and the SDK only
// supports Vertex auth (project/location/service-account) on Node runtimes —
// it's ignored in the browser. This app has no backend yet, so these stay
// disabled until one exists to proxy Vertex calls.
const ENTERPRISE_ONLY_HINT =
  'Доступно только через backend с Vertex AI Enterprise — пока не поддерживается в этом браузерном приложении'

// Confirmed by hitting the live API: every veo-3.1-*-preview model currently
// available on this key rejects these fields outright ("currently not
// supported" / "not supported by this model"), regardless of value.
const VEO_PREVIEW_UNSUPPORTED_HINT = 'Не поддерживается моделями Veo 3.1 preview на данный момент'

export function GeminiImagenParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
  const RATIOS = ['16:9', '1:1', '9:16', '4:3', '3:4']
  const RESOLUTIONS = ['1K', '2K']
  const prompt = edgeInput(node.data, edges, resolved, 0)
  const isJpeg = params.outputMimeType === 'image/jpeg'
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
          {IMAGEN_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName ?? m.id}
            </option>
          ))}
        </select>
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
      <div className={styles.fld}>
        <span>Разрешение</span>
        <select
          value={params.resolution as string}
          onChange={(e) => {
            updateNodeParam(node.id, 'resolution', e.target.value)
          }}
        >
          {RESOLUTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld} title={ENTERPRISE_ONLY_HINT}>
        <span>Негативный промпт</span>
        <input type="text" disabled defaultValue={params.negativePrompt as string} />
      </div>
      <div className={styles.fld}>
        <span>Количество изображений</span>
        <select
          value={String(params.numberOfImages ?? 1)}
          onChange={(e) => updateNodeParam(node.id, 'numberOfImages', Number(e.target.value))}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld} title={ENTERPRISE_ONLY_HINT}>
        <span>Сид (seed)</span>
        <input type="text" disabled placeholder="авто" defaultValue={params.seed as string} />
      </div>
      <div className={styles.fld}>
        <span>Guidance Scale</span>
        <input
          type="text"
          placeholder="авто"
          defaultValue={params.guidanceScale as string}
          onBlur={(e) => updateNodeParam(node.id, 'guidanceScale', e.target.value)}
        />
      </div>
      <div className={styles.fld}>
        <span>Генерация людей</span>
        <select
          value={params.personGeneration as string}
          onChange={(e) => updateNodeParam(node.id, 'personGeneration', e.target.value)}
        >
          {PERSON_GENERATION_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Уровень safety-фильтра</span>
        <select
          value={params.safetyFilterLevel as string}
          onChange={(e) => updateNodeParam(node.id, 'safetyFilterLevel', e.target.value)}
        >
          {SAFETY_FILTER_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Формат вывода</span>
        <select
          value={params.outputMimeType as string}
          onChange={(e) => updateNodeParam(node.id, 'outputMimeType', e.target.value)}
        >
          {OUTPUT_MIME_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {isJpeg && (
        <div className={styles.fld}>
          <span>Качество JPEG (0-100)</span>
          <input
            type="text"
            defaultValue={params.outputCompressionQuality as number}
            onBlur={(e) =>
              updateNodeParam(node.id, 'outputCompressionQuality', Number(e.target.value))
            }
          />
        </div>
      )}
      <div className={styles.fld}>
        <span>Язык промпта</span>
        <select
          value={params.language as string}
          onChange={(e) => updateNodeParam(node.id, 'language', e.target.value)}
        >
          {LANGUAGE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <div
        className={styles.fld}
        style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        title={ENTERPRISE_ONLY_HINT}
      >
        <span style={{ minWidth: 100, margin: 0 }}>Улучшить промпт</span>
        <div className={styles.segBtn} style={{ width: 'auto' }}>
          <button disabled className={params.enhancePrompt ? styles.isOn : ''}>
            да
          </button>
          <button disabled className={!params.enhancePrompt ? styles.isOn : ''}>
            нет
          </button>
        </div>
      </div>
    </>
  )
}

const VEO_MODELS: GeminiModelInfo[] = [
  { id: 'veo-3.1-generate-preview', displayName: 'Veo 3.1' },
  { id: 'veo-3.1-fast-generate-preview', displayName: 'Veo 3.1 Fast' },
  { id: 'veo-3.1-lite-generate-preview', displayName: 'Veo 3.1 Lite' },
]

// Veo's personGeneration is a plain lowercase string, no 'allow_all' option (unlike Imagen).
const VEO_PERSON_GENERATION_OPTIONS = [
  { id: 'dont_allow', label: 'Запрещено' },
  { id: 'allow_adult', label: 'Только взрослые' },
]

export function GeminiVeoParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
  const RATIOS = ['16:9', '9:16']
  const RESOLUTIONS = ['720p', '1080p']
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
          {VEO_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName ?? m.id}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Соотношение сторон</span>
        <select
          value={params.aspectRatio as string}
          onChange={(e) => updateNodeParam(node.id, 'aspectRatio', e.target.value)}
        >
          {RATIOS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Разрешение</span>
        <select
          value={params.resolution as string}
          onChange={(e) => updateNodeParam(node.id, 'resolution', e.target.value)}
        >
          {RESOLUTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Длительность (сек)</span>
        <input
          type="text"
          defaultValue={params.durationSeconds as number}
          onBlur={(e) => updateNodeParam(node.id, 'durationSeconds', Number(e.target.value))}
        />
      </div>
      <div className={styles.fld}>
        <span>Негативный промпт</span>
        <input
          type="text"
          defaultValue={params.negativePrompt as string}
          onBlur={(e) => updateNodeParam(node.id, 'negativePrompt', e.target.value)}
        />
      </div>
      <div className={styles.fld} title={ENTERPRISE_ONLY_HINT}>
        <span>Сид (seed)</span>
        <input type="text" disabled placeholder="авто" defaultValue={params.seed as string} />
      </div>
      <div className={styles.fld} title={VEO_PREVIEW_UNSUPPORTED_HINT}>
        <span>Генерация людей</span>
        <select disabled value={params.personGeneration as string}>
          {VEO_PERSON_GENERATION_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div
        className={styles.fld}
        style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        title={VEO_PREVIEW_UNSUPPORTED_HINT}
      >
        <span style={{ minWidth: 100, margin: 0 }}>Улучшить промпт</span>
        <div className={styles.segBtn} style={{ width: 'auto' }}>
          <button disabled className={params.enhancePrompt ? styles.isOn : ''}>
            да
          </button>
          <button disabled className={!params.enhancePrompt ? styles.isOn : ''}>
            нет
          </button>
        </div>
      </div>
      <div
        className={styles.fld}
        style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        title={ENTERPRISE_ONLY_HINT}
      >
        <span style={{ minWidth: 100, margin: 0 }}>Звук</span>
        <div className={styles.segBtn} style={{ width: 'auto' }}>
          <button disabled className={params.generateAudio ? styles.isOn : ''}>
            да
          </button>
          <button disabled className={!params.generateAudio ? styles.isOn : ''}>
            нет
          </button>
        </div>
      </div>
    </>
  )
}

const NANO_BANANA_MODELS: GeminiModelInfo[] = [
  { id: 'gemini-3.1-flash-image', displayName: 'Nano Banana 2' },
  { id: 'gemini-3-pro-image', displayName: 'Nano Banana Pro' },
  { id: 'gemini-2.5-flash-image', displayName: 'Gemini 2.5 Flash Image' },
]

// Nano Banana's own personGeneration enum (ALLOW_ALL/ALLOW_ADULT/ALLOW_NONE, per the
// SDK's ImageConfig doc comment) — distinct from Imagen's DONT_ALLOW/ALLOW_ADULT/ALLOW_ALL
// and Veo's lowercase dont_allow/allow_adult pair. Confirmed live: this field is
// Vertex/Enterprise-only, same gating as Imagen/Veo's disabled fields above.
const NANO_BANANA_PERSON_OPTIONS = [
  { id: 'ALLOW_ALL', label: 'Все' },
  { id: 'ALLOW_ADULT', label: 'Только взрослые' },
  { id: 'ALLOW_NONE', label: 'Запрещено' },
]

export function GeminiNanoBananaParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
  const RATIOS = ['16:9', '1:1', '9:16', '3:2', '2:3', '4:3', '21:9']
  const SIZES = ['1K', '2K', '4K']
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
          {NANO_BANANA_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName ?? m.id}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Соотношение сторон</span>
        <select
          value={params.aspectRatio as string}
          onChange={(e) => updateNodeParam(node.id, 'aspectRatio', e.target.value)}
        >
          {RATIOS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Разрешение</span>
        <select
          value={params.imageSize as string}
          onChange={(e) => updateNodeParam(node.id, 'imageSize', e.target.value)}
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Сид (seed)</span>
        <input
          type="text"
          placeholder="авто"
          defaultValue={params.seed as string}
          onBlur={(e) => updateNodeParam(node.id, 'seed', e.target.value)}
        />
      </div>
      <div className={styles.fld} title={ENTERPRISE_ONLY_HINT}>
        <span>Генерация людей</span>
        <select disabled value={params.personGeneration as string}>
          {NANO_BANANA_PERSON_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

const LYRIA_MODELS: GeminiModelInfo[] = [
  { id: 'lyria-3-clip-preview', displayName: 'Lyria 3 Clip' },
  { id: 'lyria-3-pro-preview', displayName: 'Lyria 3 Pro' },
]

export function GeminiLyriaParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
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
          {LYRIA_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName ?? m.id}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Сид (seed)</span>
        <input
          type="text"
          placeholder="авто"
          defaultValue={params.seed as string}
          onBlur={(e) => updateNodeParam(node.id, 'seed', e.target.value)}
        />
      </div>
    </>
  )
}
