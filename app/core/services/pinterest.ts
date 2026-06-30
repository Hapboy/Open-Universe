import { DEFAULT_PINS } from '../../data/presets.ts'
import type { BoardItem, PinItem } from '../../types.ts'

type ShowToast = (msg: string) => void

export const PinterestService = {
  async fetchBoards(showToast: ShowToast): Promise<BoardItem[]> {
    const MOCK: BoardItem[] = [
      { id: 'board_art', name: 'Армянский Авангард' },
      { id: 'board_kond', name: 'Конд Архитектура' },
      { id: 'board_taraz', name: 'Тараз & Одежда' },
    ]
    const token = (import.meta.env.VITE_PINTEREST_TOKEN as string) ?? ''
    if (!token) return MOCK
    try {
      showToast('Загрузка досок Pinterest...')
      const res = await fetch('https://api.pinterest.com/v5/boards', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { items?: BoardItem[] }
      return data.items || []
    } catch {
      showToast('Pinterest API: Ошибка CORS/Авторизации. Включен симулятор.')
      return MOCK
    }
  },

  async fetchPins(boardId: string): Promise<PinItem[]> {
    const token = (import.meta.env.VITE_PINTEREST_TOKEN as string) ?? ''
    if (!token || !boardId || boardId.startsWith('mock_')) {
      if (boardId === 'board_kond')
        return [
          {
            id: 'pk1',
            title: 'Узкие улочки Конда',
            image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300',
          },
          {
            id: 'pk2',
            title: 'Старый дом с эркером',
            image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300',
          },
          {
            id: 'pk3',
            title: 'Красная крыша',
            image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300',
          },
        ]
      if (boardId === 'board_taraz')
        return [
          {
            id: 'pt1',
            title: 'Вышивка Loom Weaving',
            image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=300',
          },
          {
            id: 'pt2',
            title: 'Красный пояс тараз',
            image: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=300',
          },
        ]
      return DEFAULT_PINS
    }
    try {
      const res = await fetch(`https://api.pinterest.com/v5/boards/${boardId}/pins`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as {
        items?: Array<{
          id: string
          title?: string
          media?: { images?: Record<string, { url: string }> }
        }>
      }
      return (data.items || []).map((p) => ({
        id: p.id,
        title: p.title || 'Pinterest Pin',
        image:
          p.media?.images?.['400x300']?.url ||
          p.media?.images?.originals?.url ||
          DEFAULT_PINS[0].image,
      }))
    } catch {
      return DEFAULT_PINS
    }
  },
}
