import type { FacialRef, PinItem } from '../types.ts';

export const FACIAL_REFS: FacialRef[] = [
  { name: 'Ара Гехецик (Канон)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'Анаит (Канон)',       url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { name: 'Давид Сасунский',     url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' }
];

export const HIGGSFIELD_PRESETS: string[] = [
  'Орбита (360°)',
  'Crash-Zoom',
  'Bullet-Time',
  'Панорамирование',
  'Наезд снизу'
];

export const DEFAULT_PINS: PinItem[] = [
  { id: 'pin1', title: 'Армянский орнамент',  image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300' },
  { id: 'pin2', title: 'Старый Конд эскиз',   image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=300' },
  { id: 'pin3', title: 'Горный пейзаж Гарни', image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=300' },
  { id: 'pin4', title: 'Национальный Тараз',  image: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=300' }
];
