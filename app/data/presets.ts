import type { EntityPresets, PinItem } from '../types.ts'

// Seed data for the global entity preset library (PresetLibraryContext),
// keyed by entity node type. Extracted from the entity node templates in
// data/nodes.ts, which now only keep each type's default selectedItem/fields.
export const ENTITY_PRESET_SEEDS: Record<string, EntityPresets> = {
  character: {
    'Ара Гехецик': {
      inFrame: true,
      age: 34,
      emotion: 'спокойствие',
      stylist: 'Без стилиста',
      photos: [] as string[],
      photoIdx: 0,
      pinterestUrl: '',
    },
    'Анаит Багратуни': {
      inFrame: true,
      age: 34,
      emotion: 'спокойствие',
      stylist: 'Без стилиста',
      photos: [] as string[],
      photoIdx: 0,
      pinterestUrl: '',
    },
    'Вардан Майриг': {
      inFrame: true,
      age: 34,
      emotion: 'спокойствие',
      stylist: 'Без стилиста',
      photos: [] as string[],
      photoIdx: 0,
      pinterestUrl: '',
    },
    Цовинар: {
      inFrame: true,
      age: 34,
      emotion: 'спокойствие',
      stylist: 'Без стилиста',
      photos: [] as string[],
      photoIdx: 0,
      pinterestUrl: '',
    },
  },
  location: {
    'Старый Конд': {
      weather: 'туман',
      timeOfDay: 'рассвет',
      interiorExterior: 'Экстерьер',
      damageLevel: 0,
    },
    Каскад: {
      weather: 'туман',
      timeOfDay: 'рассвет',
      interiorExterior: 'Экстерьер',
      damageLevel: 0,
    },
    Гарни: {
      weather: 'туман',
      timeOfDay: 'рассвет',
      interiorExterior: 'Экстерьер',
      damageLevel: 0,
    },
    Севан: {
      weather: 'туман',
      timeOfDay: 'рассвет',
      interiorExterior: 'Экстерьер',
      damageLevel: 0,
    },
  },
  building: {
    'Дом с эркером': { inFrame: true, floor: 2 },
    Чайхана: { inFrame: true, floor: 2 },
    Мастерская: { inFrame: true, floor: 2 },
    'Двор-колодец': { inFrame: true, floor: 2 },
  },
  clothing: {
    'Tigran Avetisyan': { season: 'FW26', wear: 12 },
    'Anna K': { season: 'FW26', wear: 12 },
    'Loom Weaving': { season: 'FW26', wear: 12 },
    'Taraz (нац.)': { season: 'FW26', wear: 12 },
  },
  artwork: {
    'Минас Аветисян': { inFrame: true, scale: 120 },
    Сарьян: { inFrame: true, scale: 120 },
    'Параджанов коллаж': { inFrame: true, scale: 120 },
    Хачкар: { inFrame: true, scale: 120 },
  },
  furniture: {
    'Тахта + ковёр': { inFrame: true, density: 5 },
    'Резной буфет': { inFrame: true, density: 5 },
    Тонет: { inFrame: true, density: 5 },
    Минимал: { inFrame: true, density: 5 },
  },
  music: {
    'Армянский дудук': { mood: 'элегия' },
    'Джаз-квартет': { mood: 'элегия' },
    'Электронный минимал': { mood: 'элегия' },
    Тишина: { mood: 'элегия' },
  },
  script: {
    'Сцена 04: Утро в Конде': { tone: 'драма' },
    'Пролог · Севан': { tone: 'драма' },
    Вернисаж: { tone: 'драма' },
    Финал: { tone: 'драма' },
  },
  storyboard: {
    'Утро в Конде v4': { shots: 6 },
    'Вернисаж v2': { shots: 6 },
    'Финал · одна сцена': { shots: 6 },
  },
  transport: {
    'Советский Москвич': { inFrame: false },
    'Арба конная': { inFrame: false },
    'Велосипед ретро': { inFrame: false },
    Маршрутка: { inFrame: false },
  },
}

export const HIGGSFIELD_PRESETS: string[] = [
  'Орбита (360°)',
  'Crash-Zoom',
  'Bullet-Time',
  'Панорамирование',
  'Наезд снизу',
]

export const DEFAULT_PINS: PinItem[] = [
  {
    id: 'pin1',
    title: 'Армянский орнамент',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300',
  },
  {
    id: 'pin2',
    title: 'Старый Конд эскиз',
    image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=300',
  },
  {
    id: 'pin3',
    title: 'Горный пейзаж Гарни',
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=300',
  },
  {
    id: 'pin4',
    title: 'Национальный Тараз',
    image: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=300',
  },
]
