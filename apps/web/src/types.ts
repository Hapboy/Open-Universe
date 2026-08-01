import type {
    NodeType,
    PortType,
    TeamSide,
    TeamRole,
    TimelineTrack,
    InteriorExterior,
    CharacterEmotion,
    CharacterStylist,
    Haircut,
    Tattoo,
    Accessory,
    CharacterClothingItem,
    LocationWeather,
    LocationTimeOfDay,
    ClothingSeason,
    MusicMood,
    ScriptTone,
} from "@hayverse/shared";

export type { PortType };

export interface Port {
    id: string;
    name: string;
    type: PortType;
    // Input pins accept only one incoming edge by default (connecting a new
    // wire replaces whatever was already plugged in) — set true to opt an
    // input pin out of that. Meaningless on output pins, which always allow
    // fanning out to multiple targets.
    allowMultiple?: boolean;
}

// Shape stored in React Flow node `data` field
export interface NodeParams {
    nodeType: NodeType;
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
    // Deliberately loose (defeats excess-property checking): `params` is a
    // polymorphic bag shaped per `nodeType`, with no per-type schema yet —
    // revisit once real backend param schemas exist.
    [key: string]: unknown;
}

// Minimal node reference for param-editing code that only ever needs id/data
// (e.g. NodeCard, a custom React Flow node renderer, only receives these two
// as separate props — never a full `Node<NodeParams>` with position/type/etc).
export interface NodeRef {
    id: string;
    data: NodeParams;
}

// A scene as shown in the Timeline — derived from each scene's `output_scene`
// node params, not stored separately (see GraphContext's `deriveScenes`).
export interface TimelineScene {
    id: string;
    num: string;
    title: string;
    start: number; // in seconds
    duration: number; // in seconds
    track: TimelineTrack; // for parallel scenes
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
    id: string;
    name: string;
    charName: string;
    side: TeamSide;
    role: TeamRole;
    isMe: boolean;
}

export interface CurrentUser {
    id: string;
    name: string;
    charName: string;
    side: TeamSide;
    role: TeamRole;
}

// The persisted local "account" record (signup/login stub — see
// UserContext.tsx): same shape as CurrentUser plus a password, kept separate
// from CurrentUser so the password never leaks into values passed around the
// rest of the app (ProfileModal, etc. only ever see CurrentUser).
export interface StoredAccount extends CurrentUser {
    password: string;
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

// An entity node's saved presets: key -> a snapshot of that entity's own
// params (everything except selectedItem/_presets), loaded onto the node
// when it's selected again. Keyed by the preset's stable `presetId`, not its
// (possibly non-unique, renameable) display `name`.
export type EntityPresets = Record<string, Record<string, unknown>>;

export interface WGS84Coordinates {
    lat: number | null;
    lon: number | null;
}

export interface CharacterNodeParams extends Record<string, unknown> {
    // Doubles as this node's stable cross-scene identity (see synapseData.ts's
    // identityKey) whether or not it's ever explicitly saved to the shared
    // preset library — see usePresetDatabase in shared.tsx for how it's
    // assigned.
    presetId: string;
    selectedItem: string;
    inFrame: boolean;
    age: number;
    emotion: CharacterEmotion;
    stylist: CharacterStylist;
    photos: string[];
    coverPhotoIndex: number;
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
    haircut: Haircut;
    tattoos: Tattoo;
    accessories: Accessory;
    clothing: CharacterClothingItem;
    color: string;
    additionalDescription: string;
}

export interface LocationNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    weather: LocationWeather;
    timeOfDay: LocationTimeOfDay;
    interiorExterior: InteriorExterior;
    damageLevel: number;
    coordinates: WGS84Coordinates;
    radiusKm: number;
    additionalDescription: string;
}

export interface MiseEnSceneNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    peopleCount: number;
    cameraCount: number;
    additionalDescription: string;
}

export interface BuildingNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    inFrame: boolean;
    floor: number;
}

export interface ClothingNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    season: ClothingSeason;
    wear: number;
}

export interface ArtworkNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    inFrame: boolean;
    scale: number;
}

export interface FurnitureNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    inFrame: boolean;
    density: number;
}

export interface MusicNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    mood: MusicMood;
}

export interface ScriptNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    tone: ScriptTone;
}

export interface StoryboardNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    shots: number;
}

export interface TransportNodeParams extends Record<string, unknown> {
    presetId: string;
    selectedItem: string;
    name: string;
    photos: string[];
    coverPhotoIndex: number;
    inFrame: boolean;
}
