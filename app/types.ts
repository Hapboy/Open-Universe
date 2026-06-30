export type PortType = 'Image' | 'Video' | 'Audio' | 'Text' | 'any'
export type PlayerMode = 'film' | 'game'
export type CamMode = 'classic' | 'top' | 'side' | 'one'
export type CanonMode = 'canon' | 'mv'

export interface Port {
  id: string
  name: string
  type: PortType
}

// Shape stored in React Flow node `data` field
export interface NodeParams {
  nodeType: string
  label: string
  color: string
  icon: string
  inputs: Port[]
  outputs: Port[]
  params: Record<string, unknown>
  [key: string]: unknown
}

export interface Scene {
  id: string
  num: string
  title: string
  sub: string
  sky: string
  ground: string
}

export interface PinItem {
  id: string
  title: string
  image: string
}

export interface BoardItem {
  id: string
  name: string
}

export interface TeamMember {
  name: string
  charName: string
  side: string
  role: string
  isMe: boolean
}

export interface CurrentUser {
  name: string
  charName: string
  side: string
  role: string
}

export interface Palette {
  sky: string
  orb: string
  ground: string
  wall: string
  brick: string
  frame: string
  fig: string
  art: string
  sofa: string
}

export interface CharacterNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  inFrame: boolean
  age: number
  emotion: string
  stylist: string
  photos: string[]
  photoIdx: number
  pinterestUrl: string
}

export interface LocationNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  weather: string
  timeOfDay: string
}

export interface BuildingNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  inFrame: boolean
  floor: number
}

export interface ClothingNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  season: string
  wear: number
}

export interface ArtworkNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  inFrame: boolean
  scale: number
}

export interface FurnitureNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  inFrame: boolean
  density: number
}

export interface MusicNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  mood: string
}

export interface ScriptNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  tone: string
}

export interface StoryboardNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  shots: number
}

export interface TransportNodeParams extends Record<string, unknown> {
  _db: string[]
  selectedItem: string
  inFrame: boolean
}

export interface PlayerState {
  isPlaying: boolean
  movieTime: number
  activeSceneIndex: number
  playerMode: PlayerMode
  cam: CamMode
  pal: number
  dlg: boolean
  tempo: number
  gameAv: { x: number; y: number }
  gameSavedT: number
}
