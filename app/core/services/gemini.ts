import { GoogleGenAI } from '@google/genai'

type ShowToast = (msg: string) => void

export const GeminiService = {
  _ai() {
    return new GoogleGenAI({ apiKey: (import.meta.env.VITE_GEMINI_KEY as string) ?? '' })
  },

  async runText(prompt: string, showToast: ShowToast): Promise<string | null> {
    if (!import.meta.env.VITE_GEMINI_KEY) {
      showToast('Gemini Text: mock режим')
      return `[Gemini mock] ${prompt}`
    }
    try {
      showToast('Gemini: генерация текста…')
      const res = await GeminiService._ai().models.generateContent({
        model: 'gemini-2.0-flash',
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

  async runVision(imageUrl: string, query: string, showToast: ShowToast): Promise<string | null> {
    if (!import.meta.env.VITE_GEMINI_KEY) {
      showToast('Gemini Vision: mock режим')
      return '[Gemini mock] Scene with Armenian aesthetic, warm light, cinematic composition.'
    }
    try {
      showToast('Gemini Vision: анализ изображения…')
      const base64 = await GeminiService._urlToBase64(imageUrl)
      const res = await GeminiService._ai().models.generateContent({
        model: 'gemini-2.0-flash',
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
    aspectRatio: string,
    showToast: ShowToast
  ): Promise<string | null> {
    if (!import.meta.env.VITE_GEMINI_KEY) {
      showToast('Imagen 4: mock режим')
      return null
    }
    try {
      showToast('Imagen 4: генерация кадра…')
      const res = await GeminiService._ai().models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: { numberOfImages: 1, aspectRatio },
      })
      const bytes = res.generatedImages?.[0]?.image?.imageBytes
      if (!bytes) throw new Error('no image bytes')
      const dataUrl = await GeminiService._bytesToDataUrl(bytes as Uint8Array)
      showToast('Imagen 4: изображение готово!')
      return dataUrl
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

  _bytesToDataUrl(bytes: Uint8Array): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(new Blob([bytes], { type: 'image/png' }))
    })
  },
}
