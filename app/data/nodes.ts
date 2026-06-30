import { DEFAULT_PINS } from './presets.ts';
import type { Port, PortType } from '../types.ts';

export const PORT_TYPES = {
  IMAGE: 'Image' as PortType,
  VIDEO: 'Video' as PortType,
  AUDIO: 'Audio' as PortType,
  TEXT:  'Text'  as PortType,
};

export interface NodeTemplate {
  type: string;
  label: string;
  icon: string;
  color: string;
  inputs: Omit<Port, 'id'>[];
  outputs: Omit<Port, 'id'>[];
  params: Record<string, unknown>;
}

export const NODE_TEMPLATES: Record<string, NodeTemplate> = {
  pinterest_board: {
    type: 'pinterest_board',
    label: 'Pinterest Доска',
    icon: 'ti-social',
    color: 'var(--color-node-pinterest)',
    inputs: [],
    outputs: [{ name: 'Pin Image', type: PORT_TYPES.IMAGE }],
    params: {
      boardId: '',
      boardName: 'Выберите доску...',
      selectedPin: DEFAULT_PINS[0].image,
      pins: DEFAULT_PINS,
      boards: []
    }
  },

  higgsfield_soul: {
    type: 'higgsfield_soul',
    label: 'Higgsfield Soul',
    icon: 'ti-sparkles',
    color: 'var(--color-node-higgsfield)',
    inputs: [
      { name: 'Face Ref',     type: PORT_TYPES.IMAGE },
      { name: 'Style Prompt', type: PORT_TYPES.TEXT  }
    ],
    outputs: [{ name: 'Generated Frame', type: PORT_TYPES.IMAGE }],
    params: {
      prompt: 'Эстетичный кадр, армянский авангард, свет Сарьяна',
      faceWeight: 0.8,
      seed: 42
    }
  },

  higgsfield_camera: {
    type: 'higgsfield_camera',
    label: 'Higgsfield Motion',
    icon: 'ti-video',
    color: 'var(--color-node-higgsfield)',
    inputs:  [{ name: 'Frame Input',  type: PORT_TYPES.IMAGE }],
    outputs: [{ name: 'Camera Video', type: PORT_TYPES.VIDEO }],
    params: { motionPreset: 'Орбита (360°)', speed: 1.2 }
  },

  higgsfield_speak: {
    type: 'higgsfield_speak',
    label: 'Higgsfield Speak',
    icon: 'ti-message-chatbot',
    color: 'var(--color-node-higgsfield)',
    inputs: [
      { name: 'Avatar Frame', type: PORT_TYPES.IMAGE },
      { name: 'Audio Voice',  type: PORT_TYPES.AUDIO }
    ],
    outputs: [{ name: 'Lipsync Video', type: PORT_TYPES.VIDEO }],
    params: { expression: 'Эмоциональный диалог', language: 'Армянский' }
  },

  output_scene: {
    type: 'output_scene',
    label: 'Выходная Сцена',
    icon: 'ti-movie',
    color: 'var(--color-node-scene)',
    inputs: [
      { name: 'Visual Render', type: PORT_TYPES.IMAGE },
      { name: 'Motion Render', type: PORT_TYPES.VIDEO }
    ],
    outputs: [],
    params: { renderingEngine: 'Hayverse Realtime Veo 3' }
  },

  text_prompt: {
    type: 'text_prompt',
    label: 'Текстовый Промпт',
    icon: 'ti-notes',
    color: 'var(--color-node-util)',
    inputs: [],
    outputs: [{ name: 'Text Out', type: PORT_TYPES.TEXT }],
    params: { text: 'Винтажные тона, Кондский дворик в дымке' }
  },

  character: {
    type: 'character',
    label: 'Персонаж',
    icon: 'ti-user',
    color: 'var(--color-node-higgsfield)',
    inputs: [{ name: 'Clothing', type: 'any' as PortType }],
    outputs: [{ name: 'Character Out', type: 'any' as PortType }],
    params: {
      selectedItem: 'Ара Гехецик',
      inFrame: true,
      age: 34,
      emotion: 'спокойствие',
      stylist: 'Без стилиста',
      _db: ['Ара Гехецик', 'Анаит Багратуни', 'Вардан Майриг', 'Цовинар'],
      photos: [] as string[],
      photoIdx: 0,
      pinterestUrl: '',
    }
  },

  location: {
    type: 'location',
    label: 'Локация',
    icon: 'ti-map-pin',
    color: 'var(--color-node-scene)',
    inputs: [{ name: 'Building', type: 'any' as PortType }],
    outputs: [{ name: 'Location Out', type: 'any' as PortType }],
    params: {
      selectedItem: 'Старый Конд',
      weather: 'туман',
      timeOfDay: 'рассвет',
      _db: ['Старый Конд', 'Каскад', 'Гарни', 'Севан'],
    }
  },

  building: {
    type: 'building',
    label: 'Здание',
    icon: 'ti-building-arch',
    color: 'var(--color-node-character)',
    inputs: [
      { name: 'Artwork',   type: 'any' as PortType },
      { name: 'Furniture', type: 'any' as PortType },
    ],
    outputs: [{ name: 'Building Out', type: 'any' as PortType }],
    params: {
      selectedItem: 'Дом с эркером',
      inFrame: true,
      floor: 2,
      _db: ['Дом с эркером', 'Чайхана', 'Мастерская', 'Двор-колодец'],
    }
  },

  clothing: {
    type: 'clothing',
    label: 'Одежда',
    icon: 'ti-shirt',
    color: 'var(--color-node-clothing)',
    inputs: [],
    outputs: [{ name: 'Clothing Out', type: 'any' as PortType }],
    params: {
      selectedItem: 'Tigran Avetisyan',
      season: 'FW26',
      wear: 12,
      _db: ['Tigran Avetisyan', 'Anna K', 'Loom Weaving', 'Taraz (нац.)'],
    }
  },

  artwork: {
    type: 'artwork',
    label: 'Искусство',
    icon: 'ti-palette',
    color: 'var(--color-node-artwork)',
    inputs: [],
    outputs: [{ name: 'Artwork Out', type: 'any' as PortType }],
    params: {
      selectedItem: 'Минас Аветисян',
      inFrame: true,
      scale: 120,
      _db: ['Минас Аветисян', 'Сарьян', 'Параджанов коллаж', 'Хачкар'],
    }
  },

  furniture: {
    type: 'furniture',
    label: 'Мебель',
    icon: 'ti-armchair',
    color: 'var(--color-node-util)',
    inputs: [],
    outputs: [{ name: 'Furniture Out', type: 'any' as PortType }],
    params: {
      selectedItem: 'Тахта + ковёр',
      inFrame: true,
      density: 5,
      _db: ['Тахта + ковёр', 'Резной буфет', 'Тонет', 'Минимал'],
    }
  },

  music: {
    type: 'music',
    label: 'Музыка',
    icon: 'ti-music',
    color: 'var(--color-node-scene)',
    inputs: [],
    outputs: [{ name: 'Audio Out', type: PORT_TYPES.AUDIO }],
    params: {
      selectedItem: 'Армянский дудук',
      mood: 'элегия',
      _db: ['Армянский дудук', 'Джаз-квартет', 'Электронный минимал', 'Тишина'],
    }
  },

  script: {
    type: 'script',
    label: 'Сценарий',
    icon: 'ti-file-text',
    color: 'var(--color-node-util)',
    inputs: [],
    outputs: [{ name: 'Text Out', type: PORT_TYPES.TEXT }],
    params: {
      selectedItem: 'Сцена 04: Утро в Конде',
      tone: 'драма',
      _db: ['Сцена 04: Утро в Конде', 'Пролог · Севан', 'Вернисаж', 'Финал'],
    }
  },

  storyboard: {
    type: 'storyboard',
    label: 'Раскадровка',
    icon: 'ti-layout-board',
    color: 'var(--color-node-higgsfield)',
    inputs: [{ name: 'Text Out', type: PORT_TYPES.TEXT }],
    outputs: [{ name: 'Image Out', type: PORT_TYPES.IMAGE }],
    params: {
      selectedItem: 'Утро в Конде v4',
      shots: 6,
      _db: ['Утро в Конде v4', 'Вернисаж v2', 'Финал · одна сцена'],
    }
  },

  transport: {
    type: 'transport',
    label: 'Транспорт',
    icon: 'ti-car',
    color: 'var(--color-node-character)',
    inputs: [],
    outputs: [{ name: 'Transport Out', type: 'any' as PortType }],
    params: {
      selectedItem: 'Советский Москвич',
      inFrame: false,
      _db: ['Советский Москвич', 'Арба конная', 'Велосипед ретро', 'Маршрутка'],
    }
  },
};

// Ordered list for palette display
export const PALETTE_GROUPS: { label: string; types: string[] }[] = [
  { label: 'Сущности',     types: ['character', 'location', 'building', 'clothing', 'artwork', 'furniture'] },
  { label: 'Нарратив',     types: ['music', 'script', 'storyboard', 'transport'] },
  { label: 'Pinterest',    types: ['pinterest_board'] },
  { label: 'Higgsfield AI', types: ['higgsfield_soul', 'higgsfield_camera', 'higgsfield_speak'] },
  { label: 'Утилиты',      types: ['text_prompt'] },
  { label: 'Вывод',        types: ['output_scene'] },
];
