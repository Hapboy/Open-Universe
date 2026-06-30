export type PortType   = 'Image' | 'Video' | 'Audio' | 'Text' | 'any';
export type PlayerMode = 'film' | 'game';
export type CamMode    = 'classic' | 'top' | 'side' | 'one';
export type CanonMode  = 'canon' | 'mv';

export interface Port {
  id: string;
  name: string;
  type: PortType;
}

// Shape stored in React Flow node `data` field
export interface NodeParams {
  nodeType: string;
  label: string;
  color: string;
  icon: string;
  inputs: Port[];
  outputs: Port[];
  params: Record<string, unknown>;
}

export interface Scene {
  id: string;
  num: string;
  title: string;
  sub: string;
  sky: string;
  ground: string;
}

export interface FacialRef {
  name: string;
  url: string;
}

export interface PinItem {
  id: string;
  title: string;
  image: string;
}

export interface BoardItem {
  id: string;
  name: string;
}

export interface TeamMember {
  name: string;
  charName: string;
  side: string;
  role: string;
  isMe: boolean;
}

export interface CurrentUser {
  name: string;
  charName: string;
  side: string;
  role: string;
}

export interface Palette {
  sky: string;
  orb: string;
  ground: string;
  wall: string;
  brick: string;
  frame: string;
  fig: string;
  art: string;
  sofa: string;
}

export interface PlayerState {
  isPlaying: boolean;
  movieTime: number;
  activeSceneIndex: number;
  playerMode: PlayerMode;
  cam: CamMode;
  pal: number;
  dlg: boolean;
  tempo: number;
  gameAv: { x: number; y: number };
  gameSavedT: number;
}
