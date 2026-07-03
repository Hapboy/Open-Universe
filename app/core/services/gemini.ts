import { GoogleGenAI } from '@google/genai'
import type { ImagePromptLanguage, PersonGeneration, SafetyFilterLevel } from '@google/genai'

type ShowToast = (msg: string) => void

export interface GeminiModelInfo {
  id: string
  displayName?: string
}

export interface ImagenOptions {
  aspectRatio: string
  model: string
  resolution: string
  negativePrompt?: string
  numberOfImages?: number
  seed?: number
  personGeneration?: string
  safetyFilterLevel?: string
  enhancePrompt?: boolean
  outputMimeType?: string
  outputCompressionQuality?: number
  guidanceScale?: number
  language?: string
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
      const hasSeed = options.seed !== undefined
      const res = await GeminiService._ai().models.generateImages({
        model: options.model || 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: options.numberOfImages ?? 1,
          aspectRatio: options.aspectRatio,
          imageSize: options.resolution,
          negativePrompt: options.negativePrompt || undefined,
          seed: options.seed,
          // seed and watermark are mutually exclusive per the Imagen API;
          // watermark isn't user-exposed, so force it off whenever a seed is set
          addWatermark: hasSeed ? false : undefined,
          personGeneration: options.personGeneration as PersonGeneration,
          safetyFilterLevel: options.safetyFilterLevel as SafetyFilterLevel,
          enhancePrompt: options.enhancePrompt,
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
