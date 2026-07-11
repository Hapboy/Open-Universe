export type PortType = "Image" | "Video" | "Audio" | "Text";

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
    // UI-only display flags — deliberately kept outside `params` so they
    // never leak into a character's JSON output pin or get swept into
    // preset snapshots (which only ever look at `params`).
    showJsonPreview?: boolean;
    pinLabelsWide?: boolean;
    promptPanelOpen?: boolean;
    [key: string]: unknown;
}

// Minimal node reference for param-editing code that only ever needs id/data
// (e.g. NodeCard, a custom React Flow node renderer, only receives these two
// as separate props — never a full `Node<NodeParams>` with position/type/etc).
export interface NodeRef {
    id: string;
    data: NodeParams;
}

export interface Scene {
    id: string;
    num: string;
    title: string;
    sub: string;
    sky: string;
    ground: string;
}

// A scene as shown in the Timeline — derived from each scene's `output_scene`
// node params, not stored separately (see GraphContext's `deriveScenes`).
export interface TimelineScene {
    id: string;
    num: string;
    title: string;
    start: number; // in seconds
    duration: number; // in seconds
    track: number; // 1 or 2 (for parallel scenes)
    coverUrl: string;
    cameraActive: boolean;
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

// An entity node's saved names: key -> a snapshot of that entity's own params
// (everything except selectedItem/_presets), loaded onto the node when it's
// selected again. The dropdown's option list is just `Object.keys(_presets)`.
export type EntityPresets = Record<string, Record<string, unknown>>;

export interface WGS84Coordinates {
    lat: number | null;
    lon: number | null;
}

export interface CharacterNodeParams extends Record<string, unknown> {
    selectedItem: string;
    inFrame: boolean;
    age: number;
    emotion: string;
    stylist: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    lifetimeFrom: string;
    lifetimeTo: string;
    birthPlace: WGS84Coordinates;
    deathPlace: WGS84Coordinates;
    currentPosition: WGS84Coordinates;
    name: string;
    arcWho: string;
    arcWants: string;
    arcHow: string;
    arcStake: string;
    haircut: string;
    tattoos: string;
    accessories: string;
    clothing: string;
    color: string;
    additionalDescription: string;
}

export interface LocationNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    weather: string;
    timeOfDay: string;
    interiorExterior: "Интерьер" | "Экстерьер";
    damageLevel: number;
    coordinates: WGS84Coordinates;
    radiusKm: number;
    additionalDescription: string;
}

export interface BuildingNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    inFrame: boolean;
    floor: number;
}

export interface ClothingNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    season: string;
    wear: number;
}

export interface ArtworkNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    inFrame: boolean;
    scale: number;
}

export interface FurnitureNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    inFrame: boolean;
    density: number;
}

export interface MusicNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    mood: string;
}

export interface ScriptNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    tone: string;
}

export interface StoryboardNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    shots: number;
}

export interface TransportNodeParams extends Record<string, unknown> {
    selectedItem: string;
    name: string;
    photos: string[];
    photoIdx: number;
    pinterestUrl: string;
    inFrame: boolean;
}
