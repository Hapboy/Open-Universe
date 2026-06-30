import { DEFAULT_PINS } from '../data/presets.ts';
import type { BoardItem, PinItem } from '../types.ts';

type ShowToast = (msg: string) => void;

// ── Pinterest ─────────────────────────────────────────────────────────────────

export const PinterestService = {
  async fetchBoards(showToast: ShowToast): Promise<BoardItem[]> {
    const MOCK: BoardItem[] = [
      { id: 'board_art',   name: 'Армянский Авангард' },
      { id: 'board_kond',  name: 'Конд Архитектура'   },
      { id: 'board_taraz', name: 'Тараз & Одежда'     }
    ];
    const token = import.meta.env.VITE_PINTEREST_TOKEN as string ?? '';
    if (!token) return MOCK;
    try {
      showToast('Загрузка досок Pinterest...');
      const res = await fetch('https://api.pinterest.com/v5/boards', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { items?: BoardItem[] };
      return data.items || [];
    } catch {
      showToast('Pinterest API: Ошибка CORS/Авторизации. Включен симулятор.');
      return MOCK;
    }
  },

  async fetchPins(boardId: string): Promise<PinItem[]> {
    const token = import.meta.env.VITE_PINTEREST_TOKEN as string ?? '';
    if (!token || !boardId || boardId.startsWith('mock_')) {
      if (boardId === 'board_kond') return [
        { id: 'pk1', title: 'Узкие улочки Конда',   image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300' },
        { id: 'pk2', title: 'Старый дом с эркером', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300' },
        { id: 'pk3', title: 'Красная крыша',        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300' }
      ];
      if (boardId === 'board_taraz') return [
        { id: 'pt1', title: 'Вышивка Loom Weaving', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=300' },
        { id: 'pt2', title: 'Красный пояс тараз',   image: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=300' }
      ];
      return DEFAULT_PINS;
    }
    try {
      const res = await fetch(`https://api.pinterest.com/v5/boards/${boardId}/pins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { items?: Array<{ id: string; title?: string; media?: { images?: Record<string, { url: string }> } }> };
      return (data.items || []).map(p => ({
        id: p.id,
        title: p.title || 'Pinterest Pin',
        image: p.media?.images?.['400x300']?.url || p.media?.images?.originals?.url || DEFAULT_PINS[0].image
      }));
    } catch {
      return DEFAULT_PINS;
    }
  }
};

// ── Higgsfield ────────────────────────────────────────────────────────────────
// Auth: "Key apikey:apisecret" — set VITE_HIGGSFIELD_KEY=apikey:apisecret in .env.local
// API:  async submit → poll requests/{id}/status → completed|failed|nsfw

const HF_BASE = 'https://platform.higgsfield.ai';

interface HFJob { request_id: string }
interface HFStatus {
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw';
  images?: { url: string }[];
  video?: { url: string };
}

async function hfDelay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function hfPoll(requestId: string, auth: string): Promise<HFStatus> {
  const url = `${HF_BASE}/requests/${requestId}/status`;
  for (let i = 0; i < 60; i++) {
    await hfDelay(5000);
    const res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json() as HFStatus;
    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error('job failed');
    if (data.status === 'nsfw')   throw new Error('nsfw');
  }
  throw new Error('timeout after 5 min');
}

export const HiggsfieldService = {
  // higgsfield-ai/soul/standard — text-to-image (flagship)
  async runSoul(prompt: string, faceRefUrl: string | null, showToast: ShowToast): Promise<string> {
    const key = import.meta.env.VITE_HIGGSFIELD_KEY as string ?? '';
    if (!key) {
      showToast('Higgsfield Soul: Кадр сгенерирован (симуляция)');
      return faceRefUrl || DEFAULT_PINS[1].image;
    }
    try {
      showToast('Higgsfield Soul: Запуск генерации...');
      const auth = `Key ${key}`;
      const res = await fetch(`${HF_BASE}/higgsfield-ai/soul/standard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth },
        body: JSON.stringify({ prompt, aspect_ratio: '16:9', resolution: '720p' })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job = await res.json() as HFJob;
      showToast('Higgsfield Soul: В очереди, ожидание...');
      const result = await hfPoll(job.request_id, auth);
      const imgUrl = result.images?.[0]?.url;
      if (!imgUrl) throw new Error('no image url');
      showToast('Higgsfield Soul: Кадр готов!');
      return imgUrl;
    } catch (e) {
      console.warn('Higgsfield Soul error:', e);
      showToast('Higgsfield Soul: Ошибка API, симуляция.');
      return faceRefUrl || DEFAULT_PINS[1].image;
    }
  },

  // higgsfield-ai/dop/standard — image-to-video with cinematic camera motion
  async runMotion(frameUrl: string | null, preset: string, showToast: ShowToast): Promise<string | null> {
    const key = import.meta.env.VITE_HIGGSFIELD_KEY as string ?? '';
    if (!key || !frameUrl) {
      showToast(`Higgsfield Motion: Пресет «${preset}» применен (симуляция)`);
      return frameUrl;
    }
    try {
      showToast('Higgsfield Motion: Запуск DoP видеогенерации...');
      const auth = `Key ${key}`;
      const res = await fetch(`${HF_BASE}/higgsfield-ai/dop/standard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth },
        body: JSON.stringify({ image_url: frameUrl, prompt: preset, duration: 5 })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job = await res.json() as HFJob;
      showToast('Higgsfield Motion: В очереди, ожидание...');
      const result = await hfPoll(job.request_id, auth);
      const videoUrl = result.video?.url;
      if (!videoUrl) throw new Error('no video url');
      showToast('Higgsfield Motion: Видео готово!');
      return videoUrl;
    } catch (e) {
      console.warn('Higgsfield Motion error:', e);
      showToast('Higgsfield Motion: Ошибка API, симуляция.');
      return frameUrl;
    }
  },

  // Speak — model ID not yet documented; stub until Higgsfield publishes it
  async runSpeak(avatarUrl: string | null, speechText: string, showToast: ShowToast): Promise<string | null> {
    showToast(`Higgsfield Speak: Липсинк «${speechText.substring(0, 20)}...» (симуляция)`);
    return avatarUrl;
  }
};
