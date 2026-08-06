// Central home for every closed-value domain in the app, expressed as
// `as const` arrays/objects + a derived union type (never a real TS `enum` —
// no runtime footprint, tree-shakes cleanly, and matches the string values a
// future generated Swagger/OpenAPI client will emit).

// ── Graph wiring ────────────────────────────────────────────────────────────

export const PORT_TYPES = {
    IMAGE: "Image",
    VIDEO: "Video",
    AUDIO: "Audio",
    TEXT: "Text",
} as const;
export type PortType = (typeof PORT_TYPES)[keyof typeof PORT_TYPES];

// The 23 node types backing `data/nodes.ts`'s NODE_TEMPLATES keys. This array
// is the single source of truth — NODE_TEMPLATES is checked against it with
// `satisfies Record<NodeType, NodeTemplate>` rather than the other way
// around, so a typo/omission on either side fails `tsc`, not silently.
export const NODE_TYPES = [
    "pinterest_board",
    "higgsfield_soul",
    "higgsfield_camera",
    "higgsfield_speak",
    "gemini_text",
    "gemini_vision",
    "gemini_imagen",
    "gemini_veo",
    "gemini_nanobanana",
    "gemini_lyria",
    "output_scene",
    "text_prompt",
    "character",
    "location",
    "mise_en_scene",
    "building",
    "clothing",
    "artwork",
    "furniture",
    "music",
    "script",
    "storyboard",
    "transport",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

// core/graph.ts's SceneOutput.type
export const SCENE_OUTPUT_TYPES = ["video", "image"] as const;
export type SceneOutputType = (typeof SCENE_OUTPUT_TYPES)[number];

// types.ts's TimelineScene.track (parallel-scene track, always 1 or 2)
export const TIMELINE_TRACKS = [1, 2] as const;
export type TimelineTrack = (typeof TIMELINE_TRACKS)[number];

// core/services/higgsfield.ts's job-status poll result
export const HIGGSFIELD_JOB_STATUSES = [
    "queued",
    "in_progress",
    "completed",
    "failed",
    "nsfw",
] as const;
export type HiggsfieldJobStatus = (typeof HIGGSFIELD_JOB_STATUSES)[number];

// ── Entity domain ───────────────────────────────────────────────────────────

// types.ts's LocationNodeParams.interiorExterior
export const INTERIOR_EXTERIOR = ["Интерьер", "Экстерьер"] as const;
export type InteriorExterior = (typeof INTERIOR_EXTERIOR)[number];

// EntityParams.tsx's CharacterParams — plain SelectField dropdowns
export const CHARACTER_EMOTIONS = [
    "спокойствие",
    "грусть",
    "радость",
    "тревога",
    "задумчивость",
] as const;
export type CharacterEmotion = (typeof CHARACTER_EMOTIONS)[number];

export const CHARACTER_STYLISTS = [
    "Без стилиста",
    "Tigran Avetisyan",
    "Anna K",
    "Народный",
] as const;
export type CharacterStylist = (typeof CHARACTER_STYLISTS)[number];

// CharacterStyling.tsx's DropdownWithPreviews option value sets (labels there
// double as the SVG-preview lookup key — this is just the value domain).
export const HAIRCUT_VALUES = ["Короткая", "Каре", "Длинная", "Косы", "С дредами"] as const;
export type Haircut = (typeof HAIRCUT_VALUES)[number];

export const TATTOO_VALUES = ["Нет", "Геометрия", "Рукав", "Минимализм"] as const;
export type Tattoo = (typeof TATTOO_VALUES)[number];

export const ACCESSORY_VALUES = ["Нет", "Очки", "Серьги", "Шарф"] as const;
export type Accessory = (typeof ACCESSORY_VALUES)[number];

// A character's worn clothing item — distinct from ClothingNodeParams (the
// `clothing` node type's own season/wear fields) and from ClothingSeason
// below, hence the more specific name.
export const CHARACTER_CLOTHING_ITEMS = ["Пальто", "Куртка", "Костюм", "Свитер"] as const;
export type CharacterClothingItem = (typeof CHARACTER_CLOTHING_ITEMS)[number];

// EntityParams.tsx's LocationParams
export const LOCATION_WEATHERS = ["туман", "солнце", "дождь", "снег", "пасмурно"] as const;
export type LocationWeather = (typeof LOCATION_WEATHERS)[number];

export const LOCATION_TIMES_OF_DAY = ["рассвет", "утро", "день", "закат", "ночь"] as const;
export type LocationTimeOfDay = (typeof LOCATION_TIMES_OF_DAY)[number];

// EntityParams.tsx's ClothingParams
export const CLOTHING_SEASONS = ["FW26", "SS26", "FW25", "SS25"] as const;
export type ClothingSeason = (typeof CLOTHING_SEASONS)[number];

// EntityParams.tsx's MusicParams
export const MUSIC_MOODS = ["элегия", "торжество", "тоска", "медитация", "танец"] as const;
export type MusicMood = (typeof MUSIC_MOODS)[number];

// EntityParams.tsx's ScriptParams
export const SCRIPT_TONES = ["драма", "комедия", "лирика", "хоррор", "документ"] as const;
export type ScriptTone = (typeof SCRIPT_TONES)[number];

// ── Narrative settings (NarrativeContext.tsx's SceneNarrativeSettings) ──────

export const CONFLICT_TYPES = ["physical", "psychological"] as const;
export type ConflictType = (typeof CONFLICT_TYPES)[number];

export const CONFLICT_TARGETS = ["man_vs_man", "man_vs_nature", "man_vs_society"] as const;
export type ConflictTarget = (typeof CONFLICT_TARGETS)[number];

export const STORY_PHASES = [
    { key: "exposition", label: "Экспозиция" },
    { key: "inciting", label: "Завязка" },
    { key: "rising", label: "Развитие" },
    { key: "climax", label: "Кульминация" },
    { key: "resolution", label: "Развязка" },
] as const;
export type StoryPhase = (typeof STORY_PHASES)[number]["key"];

export const PACING_VALUES = ["slow", "moderate", "fast", "action"] as const;
export type Pacing = (typeof PACING_VALUES)[number];

export const CURVE_TYPES = ["linear", "ease_in", "ease_out", "ease_in_out"] as const;
export type CurveType = (typeof CURVE_TYPES)[number];

// ── Team / identity (UserContext.tsx) ───────────────────────────────────────

export const TEAM_SIDES = ["urvakan", "rambalkoshe", "moct"] as const;
export type TeamSide = (typeof TEAM_SIDES)[number];

export const TEAM_ROLES = ["Режиссер", "Разработчик", "Художник", "Стилист"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

// ── Modal routing (ModalContext, Phase 8) ───────────────────────────────────

export const MODAL_TYPES = ["profile", "signup", "login", "library"] as const;
export type ModalType = (typeof MODAL_TYPES)[number];

// ── Auth scaffold (AuthContext, Phase 9) ────────────────────────────────────

export const AUTH_STATUSES = ["anonymous", "authenticated"] as const;
export type AuthStatus = (typeof AUTH_STATUSES)[number];

// Placeholder access-control role — distinct from TeamRole (in-universe
// creative role like "Режиссер"). No real access-control exists yet; this is
// a provisional shape for the future backend-authenticated session.
export const AUTH_ROLES = ["member", "admin"] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];
