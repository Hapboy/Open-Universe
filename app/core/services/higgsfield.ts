import { DEFAULT_PINS } from '../../data/presets.ts'

type ShowToast = (msg: string) => void

const HF_BASE = 'https://platform.higgsfield.ai'

interface HFJob {
  request_id: string
}
interface HFStatus {
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw'
  images?: { url: string }[]
  video?: { url: string }
}

async function hfDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function hfPoll(requestId: string, auth: string): Promise<HFStatus> {
  const url = `${HF_BASE}/requests/${requestId}/status`
  for (let i = 0; i < 60; i++) {
    await hfDelay(5000)
    const res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = (await res.json()) as HFStatus
    if (data.status === 'completed') return data
    if (data.status === 'failed') throw new Error('job failed')
    if (data.status === 'nsfw') throw new Error('nsfw')
  }
  throw new Error('timeout after 5 min')
}

export const HiggsfieldService = {
  async runSoul(prompt: string, faceRefUrl: string | null, showToast: ShowToast): Promise<string> {
    const key = (import.meta.env.VITE_HIGGSFIELD_KEY as string) ?? ''
    if (!key) {
      showToast('Higgsfield Soul: Кадр сгенерирован (симуляция)')
      return faceRefUrl || DEFAULT_PINS[1].image
    }
    try {
      showToast('Higgsfield Soul: Запуск генерации...')
      const auth = `Key ${key}`
      const res = await fetch(`${HF_BASE}/higgsfield-ai/soul/standard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: auth,
        },
        body: JSON.stringify({ prompt, aspect_ratio: '16:9', resolution: '720p' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const job = (await res.json()) as HFJob
      showToast('Higgsfield Soul: В очереди, ожидание...')
      const result = await hfPoll(job.request_id, auth)
      const imgUrl = result.images?.[0]?.url
      if (!imgUrl) throw new Error('no image url')
      showToast('Higgsfield Soul: Кадр готов!')
      return imgUrl
    } catch (e) {
      console.warn('Higgsfield Soul error:', e)
      showToast('Higgsfield Soul: Ошибка API, симуляция.')
      return faceRefUrl || DEFAULT_PINS[1].image
    }
  },

  async runMotion(
    frameUrl: string | null,
    preset: string,
    showToast: ShowToast
  ): Promise<string | null> {
    const key = (import.meta.env.VITE_HIGGSFIELD_KEY as string) ?? ''
    if (!key || !frameUrl) {
      showToast(`Higgsfield Motion: Пресет «${preset}» применен (симуляция)`)
      return frameUrl
    }
    try {
      showToast('Higgsfield Motion: Запуск DoP видеогенерации...')
      const auth = `Key ${key}`
      const res = await fetch(`${HF_BASE}/higgsfield-ai/dop/standard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: auth,
        },
        body: JSON.stringify({ image_url: frameUrl, prompt: preset, duration: 5 }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const job = (await res.json()) as HFJob
      showToast('Higgsfield Motion: В очереди, ожидание...')
      const result = await hfPoll(job.request_id, auth)
      const videoUrl = result.video?.url
      if (!videoUrl) throw new Error('no video url')
      showToast('Higgsfield Motion: Видео готово!')
      return videoUrl
    } catch (e) {
      console.warn('Higgsfield Motion error:', e)
      showToast('Higgsfield Motion: Ошибка API, симуляция.')
      return frameUrl
    }
  },

  async runSpeak(
    avatarUrl: string | null,
    speechText: string,
    showToast: ShowToast
  ): Promise<string | null> {
    showToast(`Higgsfield Speak: Липсинк «${speechText.substring(0, 20)}...» (симуляция)`)
    return avatarUrl
  },
}
