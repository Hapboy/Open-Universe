import { GoogleGenAI } from '@google/genai'
import type { ImagePromptLanguage, PersonGeneration, SafetyFilterLevel } from '@google/genai'

type ShowToast = (msg: string) => void

export interface GeminiModelInfo {
  id: string
  displayName?: string
}

// This app only ever creates GoogleGenAI({ apiKey }) — the Gemini Developer API,
// not Vertex AI's "Enterprise" mode. Several GenerateImages/GenerateVideos config
// fields are Vertex-only and throw client-side in Developer API mode: for Imagen
// that's negativePrompt/seed/enhancePrompt/addWatermark, for Veo it's seed/generateAudio.
// They're intentionally omitted from these option types.
export interface ImagenOptions {
  aspectRatio: string
  model: string
  resolution: string
  numberOfImages?: number
  personGeneration?: string
  safetyFilterLevel?: string
  outputMimeType?: string
  outputCompressionQuality?: number
  guidanceScale?: number
  language?: string
}

export interface VeoOptions {
  model: string
  aspectRatio: string
  resolution: string
  durationSeconds?: number
  negativePrompt?: string
  // Veo's personGeneration is a plain lowercase string ('dont_allow' | 'allow_adult'),
  // unlike Imagen's uppercase PersonGeneration enum — no 'allow_all' option for video.
  personGeneration?: string
  enhancePrompt?: boolean
}

const DEFAULT_MODEL = 'gemini-flash-latest'

const FALLBACK_MODELS: GeminiModelInfo[] = [
  { id: 'gemini-flash-latest', displayName: 'Gemini Flash (latest)' },
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
]

let modelsCache: GeminiModelInfo[] | null = null

export const GeminiService = {
  _ai() {
    return new GoogleGenAI({ apiKey: (import.meta.env.VITE_GEMINI_KEY as string) ?? '' })
  },

  async listModels(): Promise<GeminiModelInfo[]> {
    if (!import.meta.env.VITE_GEMINI_KEY) return FALLBACK_MODELS
    if (modelsCache) return modelsCache
    try {
      const pager = await GeminiService._ai().models.list({ config: { pageSize: 100 } })
      const models: GeminiModelInfo[] = []
      for await (const m of pager) {
        if (!m.name || !m.supportedActions?.includes('generateContent')) continue
        models.push({ id: m.name.replace(/^models\//, ''), displayName: m.displayName })
      }
      modelsCache = models.length ? models : FALLBACK_MODELS
      return modelsCache
    } catch (e) {
      console.warn('Gemini listModels error:', e)
      return FALLBACK_MODELS
    }
  },

  async runText(
    prompt: string,
    showToast: ShowToast,
    model: string = DEFAULT_MODEL
  ): Promise<string | null> {
    if (!import.meta.env.VITE_GEMINI_KEY) {
      showToast('Gemini Text: mock режим')
      return `[Gemini mock] ${prompt}`
    }
    try {
      showToast('Gemini: генерация текста…')
      const res = await GeminiService._ai().models.generateContent({
        model: model || DEFAULT_MODEL,
        contents: prompt,
      })
      showToast('Gemini: текст готов')
      return res.text ?? null
    } catch (e) {
      console.warn('Gemini Text error:', e)
      showToast('Gemini Text: ошибка API')
      return null
    }
  },

  async runVision(
    imageUrl: string,
    query: string,
    showToast: ShowToast,
    model: string = DEFAULT_MODEL
  ): Promise<string | null> {
    if (!import.meta.env.VITE_GEMINI_KEY) {
      showToast('Gemini Vision: mock режим')
      return '[Gemini mock] Scene with Armenian aesthetic, warm light, cinematic composition.'
    }
    try {
      showToast('Gemini Vision: анализ изображения…')
      const base64 = await GeminiService._urlToBase64(imageUrl)
      const res = await GeminiService._ai().models.generateContent({
        model: model || DEFAULT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ text: query }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }],
          },
        ],
      })
      showToast('Gemini Vision: описание готово')
      return res.text ?? null
    } catch (e) {
      console.warn('Gemini Vision error:', e)
      showToast('Gemini Vision: ошибка API')
      return null
    }
  },

  async runImagen(
    prompt: string,
    options: ImagenOptions,
    showToast: ShowToast
  ): Promise<string | null> {
    if (!import.meta.env.VITE_GEMINI_KEY) {
      showToast('Imagen 4: mock режим')
      return null
    }
    try {
      showToast('Imagen 4: генерация кадра…')
      const res = await GeminiService._ai().models.generateImages({
        model: options.model || 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: options.numberOfImages ?? 1,
          aspectRatio: options.aspectRatio,
          imageSize: options.resolution,
          personGeneration: options.personGeneration as PersonGeneration,
          safetyFilterLevel: options.safetyFilterLevel as SafetyFilterLevel,
          outputMimeType: options.outputMimeType,
          outputCompressionQuality:
            options.outputMimeType === 'image/jpeg' ? options.outputCompressionQuality : undefined,
          guidanceScale: options.guidanceScale,
          language: options.language as ImagePromptLanguage,
        },
      })
      const bytes = res.generatedImages?.[0]?.image?.imageBytes
      if (!bytes) throw new Error('no image bytes')
      showToast('Imagen 4: изображение готово!')
      return `data:image/png;base64,${bytes}`
    } catch (e) {
      console.warn('Imagen 4 error:', e)
      showToast('Imagen 4: ошибка API')
      return null
    }
  },

  async runVeo(
    prompt: string,
    imageUrl: string | null,
    options: VeoOptions,
    showToast: ShowToast
  ): Promise<string | null> {
    if (!import.meta.env.VITE_GEMINI_KEY) {
      showToast('Veo: mock режим')
      return null
    }
    try {
      showToast('Veo: запуск генерации видео…')
      const image = imageUrl
        ? { imageBytes: await GeminiService._urlToBase64(imageUrl), mimeType: 'image/jpeg' }
        : undefined
      let operation = await GeminiService._ai().models.generateVideos({
        model: options.model || 'veo-3.1-generate-preview',
        prompt,
        image,
        config: {
          numberOfVideos: 1,
          aspectRatio: options.aspectRatio,
          resolution: options.resolution,
          durationSeconds: options.durationSeconds,
          negativePrompt: options.negativePrompt || undefined,
          // personGeneration and enhancePrompt are both rejected ("currently not
          // supported" / "not supported by this model") by every veo-3.1-*-preview
          // model available on this key right now — omitted, not just Vertex-gated.
        },
      })
      showToast('Veo: рендеринг (может занять несколько минут)…')
      // No progress fraction from the API — poll every 10s, capped at 5 min like HiggsfieldService's hfPoll.
      for (let i = 0; i < 30 && !operation.done; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10000))
        operation = await GeminiService._ai().operations.getVideosOperation({ operation })
      }
      const video = operation.response?.generatedVideos?.[0]?.video
      if (!video) throw new Error('no video in response')
      showToast('Veo: скачивание файла…')
      if (video.videoBytes)
        return `data:${video.mimeType ?? 'video/mp4'};base64,${video.videoBytes}`
      if (video.uri) {
        // ai.files.download() is Node-only; in the browser the file URI must be
        // fetched directly with the API key appended, per the SDK's own doc comment.
        const sep = video.uri.includes('?') ? '&' : '?'
        const apiKey = (import.meta.env.VITE_GEMINI_KEY as string) ?? ''
        const res = await fetch(`${video.uri}${sep}key=${apiKey}`)
        if (!res.ok) throw new Error(`video download HTTP ${res.status}`)
        const blob = await res.blob()
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        showToast('Veo: видео готово!')
        return dataUrl
      }
      throw new Error('no video uri or bytes')
    } catch (e) {
      console.warn('Veo error:', e)
      showToast('Veo: ошибка API')
      return null
    }
  },

  async _urlToBase64(url: string): Promise<string> {
    const resp = await fetch(url)
    const buf = await resp.arrayBuffer()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.readAsDataURL(new Blob([buf]))
    })
  },
}
