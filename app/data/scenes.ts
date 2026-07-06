export interface TimelineScene {
  id: string
  num: string
  title: string
  sub?: string
  start: number // in seconds
  duration: number // in seconds
  track: number // 1 or 2 (for parallel scenes)
  coverUrl: string
  cameraActive: boolean
}

export const DEFAULT_SCENES: TimelineScene[] = [
  {
    id: 'sc1',
    num: '01',
    title: 'Пролог · Севан',
    sub: 'Море помнит больше нас.',
    start: 0,
    duration: 110,
    track: 1,
    coverUrl: '/assets/sevan.png',
    cameraActive: true,
  },
  {
    id: 'sc2',
    num: '02',
    title: 'Дорога',
    sub: 'Куда ведёт тропа? Домой.',
    start: 110,
    duration: 110,
    track: 1,
    coverUrl: '/assets/road.png',
    cameraActive: true,
  },
  {
    id: 'sc3',
    num: '03',
    title: 'Рынок Вернисаж',
    sub: 'Эту вещь делал мой дед.',
    start: 220,
    duration: 110,
    track: 1,
    coverUrl: '/assets/vernissage.png',
    cameraActive: true,
  },
  {
    id: 'sc4a',
    num: '04a',
    title: 'Утро в Конде',
    sub: 'В Конде солнце приходит позже.',
    start: 330,
    duration: 140,
    track: 1,
    coverUrl: '/assets/kond.png',
    cameraActive: true,
  },
  {
    id: 'sc4b',
    num: '04b',
    title: 'Конд в тумане',
    sub: 'Шёпот старых стен в дымке.',
    start: 330,
    duration: 140,
    track: 2,
    coverUrl: '/assets/kond.png',
    cameraActive: false,
  },
  {
    id: 'sc5',
    num: '05',
    title: 'Мастерская',
    sub: 'Краска ещё живая, осторожно.',
    start: 470,
    duration: 130,
    track: 1,
    coverUrl: '/assets/sevan.png',
    cameraActive: true,
  },
  {
    id: 'sc6',
    num: '06',
    title: 'Закат · Каскад',
    sub: 'Город горит, но не сгорает.',
    start: 600,
    duration: 120,
    track: 1,
    coverUrl: '/assets/road.png',
    cameraActive: true,
  },
  {
    id: 'sc7',
    num: '07',
    title: 'Двор',
    sub: 'Здесь все друг другу родня.',
    start: 720,
    duration: 100,
    track: 1,
    coverUrl: '/assets/vernissage.png',
    cameraActive: true,
  },
  {
    id: 'sc8',
    num: '08',
    title: 'Финал',
    sub: 'Мы остаёмся. Всегда.',
    start: 820,
    duration: 52,
    track: 1,
    coverUrl: '/assets/kond.png',
    cameraActive: true,
  },
]
