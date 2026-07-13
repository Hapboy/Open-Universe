import { DEFAULT_PINS } from "./presets.ts";
import type { Port, PortType } from "../types.ts";

const PORT_TYPES = {
    IMAGE: "Image" as PortType,
    VIDEO: "Video" as PortType,
    AUDIO: "Audio" as PortType,
    TEXT: "Text" as PortType,
};

// Node types that call a paid AI generation service (GeminiService /
// HiggsfieldService) — these get a per-node Run button instead of
// auto-executing on every param change.
export const AI_MODEL_NODE_TYPES = [
    "gemini_text",
    "gemini_vision",
    "gemini_imagen",
    "gemini_veo",
    "gemini_nanobanana",
    "gemini_lyria",
    "higgsfield_soul",
    "higgsfield_camera",
    "higgsfield_speak",
];

// Entity node types with the "rich" editing UI: a toggleable prompt column
// for additionalDescription, and Description/JSON output pins (instead of a
// plain selectedItem passthrough).
export const RICH_ENTITY_NODE_TYPES = new Set(["character", "location", "mise_en_scene"]);

// All entity node types with a preset (`DatabaseSelect`) dropdown — the
// shared source of truth for both the "selectedItem passthrough" fallback
// and the photo-gallery gating in core/graph.ts and GraphContext.tsx.
export const ENTITY_NODE_TYPES = new Set([
    "character",
    "location",
    "building",
    "clothing",
    "artwork",
    "furniture",
    "music",
    "script",
    "storyboard",
    "transport",
    "mise_en_scene",
]);

export interface NodeTemplate {
    type: string;
    label: string;
    icon: string;
    color: string;
    inputs: Omit<Port, "id">[];
    outputs: Omit<Port, "id">[];
    params: Record<string, unknown>;
}

export const NODE_TEMPLATES: Record<string, NodeTemplate> = {
    pinterest_board: {
        type: "pinterest_board",
        label: "Pinterest Доска",
        icon: "ti-social",
        color: "var(--color-node-pinterest)",
        inputs: [],
        outputs: [{ name: "Pin Image", type: PORT_TYPES.IMAGE }],
        params: {
            boardId: "",
            boardName: "Выберите доску...",
            selectedPin: DEFAULT_PINS[0].image,
            pins: DEFAULT_PINS,
            boards: [],
        },
    },

    higgsfield_soul: {
        type: "higgsfield_soul",
        label: "Higgsfield Soul",
        icon: "ti-sparkles",
        color: "var(--color-node-higgsfield)",
        inputs: [
            { name: "Face Ref", type: PORT_TYPES.IMAGE },
            { name: "Style Prompt", type: PORT_TYPES.TEXT },
        ],
        outputs: [{ name: "Generated Frame", type: PORT_TYPES.IMAGE }],
        params: {
            prompt: "Эстетичный кадр, армянский авангард, свет Сарьяна",
            faceWeight: 0.8,
            seed: 42,
        },
    },

    higgsfield_camera: {
        type: "higgsfield_camera",
        label: "Higgsfield Motion",
        icon: "ti-video",
        color: "var(--color-node-higgsfield)",
        inputs: [{ name: "Frame Input", type: PORT_TYPES.IMAGE }],
        outputs: [{ name: "Camera Video", type: PORT_TYPES.VIDEO }],
        params: { motionPreset: "Орбита (360°)", speed: 1.2 },
    },

    higgsfield_speak: {
        type: "higgsfield_speak",
        label: "Higgsfield Speak",
        icon: "ti-message-chatbot",
        color: "var(--color-node-higgsfield)",
        inputs: [
            { name: "Avatar Frame", type: PORT_TYPES.IMAGE },
            { name: "Audio Voice", type: PORT_TYPES.AUDIO },
        ],
        outputs: [{ name: "Lipsync Video", type: PORT_TYPES.VIDEO }],
        params: { expression: "Эмоциональный диалог", language: "Армянский" },
    },

    gemini_text: {
        type: "gemini_text",
        label: "Gemini Text",
        icon: "ti-sparkles",
        color: "#4285F4",
        inputs: [{ name: "Prompt", type: PORT_TYPES.TEXT }],
        outputs: [{ name: "Generated Text", type: PORT_TYPES.TEXT }],
        params: { prompt: "", model: "gemini-flash-latest" },
    },

    gemini_vision: {
        type: "gemini_vision",
        label: "Gemini Vision",
        icon: "ti-eye-spark",
        color: "#4285F4",
        inputs: [
            { name: "Image", type: PORT_TYPES.IMAGE },
            { name: "Query", type: PORT_TYPES.TEXT },
        ],
        outputs: [{ name: "Description", type: PORT_TYPES.TEXT }],
        params: { query: "Describe this scene for a film", model: "gemini-flash-latest" },
    },

    gemini_imagen: {
        type: "gemini_imagen",
        label: "Imagen 4",
        icon: "ti-photo-ai",
        color: "#4285F4",
        inputs: [{ name: "Style Prompt", type: PORT_TYPES.TEXT }],
        outputs: [{ name: "Generated Image", type: PORT_TYPES.IMAGE }],
        params: {
            prompt: "",
            aspectRatio: "16:9",
            model: "imagen-4.0-generate-001",
            resolution: "1K",
            numberOfImages: 1,
            personGeneration: "ALLOW_ADULT",
            safetyFilterLevel: "BLOCK_LOW_AND_ABOVE",
            outputMimeType: "image/png",
            outputCompressionQuality: 75,
            guidanceScale: "",
            // Vertex/Enterprise-only fields — this browser app can only reach the Gemini
            // Developer API, which rejects these. Kept (disabled) on the node card for
            // when a backend proxy adds Vertex support.
            language: "auto",
            negativePrompt: "",
            seed: "",
            enhancePrompt: true,
        },
    },

    gemini_veo: {
        type: "gemini_veo",
        label: "Veo Video",
        icon: "ti-video-plus",
        color: "#4285F4",
        inputs: [
            { name: "Prompt", type: PORT_TYPES.TEXT },
            { name: "Reference Image", type: PORT_TYPES.IMAGE },
        ],
        outputs: [{ name: "Generated Video", type: PORT_TYPES.VIDEO }],
        params: {
            prompt: "",
            model: "veo-3.1-lite-generate-preview",
            aspectRatio: "16:9",
            resolution: "720p",
            durationSeconds: 4,
            negativePrompt: "",
            personGeneration: "allow_adult",
            enhancePrompt: true,
            // Vertex/Enterprise-only — see comment on gemini_imagen above.
            seed: "",
            generateAudio: true,
        },
    },

    gemini_nanobanana: {
        type: "gemini_nanobanana",
        label: "Nano Banana",
        icon: "ti-photo-spark",
        color: "#4285F4",
        inputs: [
            { name: "Prompt", type: PORT_TYPES.TEXT },
            { name: "Reference Image", type: PORT_TYPES.IMAGE },
        ],
        outputs: [{ name: "Generated Image", type: PORT_TYPES.IMAGE }],
        params: {
            prompt: "",
            model: "gemini-3.1-flash-image",
            aspectRatio: "16:9",
            imageSize: "1K",
            seed: "",
            // Vertex/Enterprise-only — see comment on gemini_imagen above.
            personGeneration: "ALLOW_ADULT",
        },
    },

    gemini_lyria: {
        type: "gemini_lyria",
        label: "Lyria Music",
        icon: "ti-music-bolt",
        color: "#4285F4",
        inputs: [{ name: "Prompt", type: PORT_TYPES.TEXT }],
        outputs: [{ name: "Generated Audio", type: PORT_TYPES.AUDIO }],
        params: {
            prompt: "",
            model: "lyria-3-clip-preview",
            seed: "",
        },
    },

    output_scene: {
        type: "output_scene",
        label: "Выходная Сцена",
        icon: "ti-movie",
        color: "var(--color-node-scene)",
        inputs: [
            { name: "Visual Render", type: PORT_TYPES.IMAGE },
            { name: "Motion Render", type: PORT_TYPES.VIDEO },
        ],
        outputs: [{ name: "Arc JSON", type: PORT_TYPES.TEXT }],
        params: {
            renderingEngine: "Hayverse Realtime Veo 3",
            title: "",
            start: 0,
            duration: 5,
            track: 1,
            coverUrl: "",
            activeOutput: "video",
        },
    },

    text_prompt: {
        type: "text_prompt",
        label: "Текстовый Промпт",
        icon: "ti-notes",
        color: "var(--color-node-util)",
        // Fixed, non-removable pin backing the node's own "text" field (same
        // wirable-or-own-value pattern as gemini_text's Prompt pin). Extra
        // pins can be appended via addTextInput — see GraphContext.tsx.
        inputs: [{ name: "Text 1", type: PORT_TYPES.TEXT }],
        outputs: [{ name: "Text Out", type: PORT_TYPES.TEXT }],
        params: { text: "Винтажные тона, Кондский дворик в дымке" },
    },

    character: {
        type: "character",
        label: "Персонаж",
        icon: "ti-user",
        color: "var(--color-node-higgsfield)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
        params: {
            selectedItem: "Ара Гехецик",
            name: "Ара Гехецик",
            inFrame: true,
            age: 34,
            emotion: "спокойствие",
            stylist: "Без стилиста",
            photos: [] as string[],
            photoIdx: 0,
            lifetimeFrom: "",
            lifetimeTo: "",
            birthPlace: { lat: null, lon: null },
            deathPlace: { lat: null, lon: null },
            currentPosition: { lat: null, lon: null },
            arcWho: "",
            arcWants: "",
            arcHow: "",
            arcStake: "",
            haircut: "Короткая",
            tattoos: "Нет",
            accessories: "Нет",
            clothing: "Куртка",
            additionalDescription: "",
        },
    },

    location: {
        type: "location",
        label: "Локация",
        icon: "ti-map-pin",
        color: "var(--color-node-scene)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
        params: {
            selectedItem: "Старый Конд",
            name: "Старый Конд",
            photos: [] as string[],
            photoIdx: 0,
            weather: "туман",
            timeOfDay: "рассвет",
            interiorExterior: "Экстерьер",
            damageLevel: 0,
            coordinates: { lat: null, lon: null },
            radiusKm: 5,
            additionalDescription: "",
        },
    },

    mise_en_scene: {
        type: "mise_en_scene",
        label: "Мизансцена",
        icon: "ti-users",
        color: "var(--color-node-clothing)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
        params: {
            selectedItem: "1 человек в кадре",
            name: "1 человек в кадре",
            photos: [] as string[],
            photoIdx: 0,
            peopleCount: 1,
            cameraCount: 1,
            additionalDescription: "",
        },
    },

    building: {
        type: "building",
        label: "Здание",
        icon: "ti-building-arch",
        color: "var(--color-node-character)",
        inputs: [],
        outputs: [],
        params: {
            selectedItem: "Дом с эркером",
            name: "Дом с эркером",
            photos: [] as string[],
            photoIdx: 0,
            inFrame: true,
            floor: 2,
        },
    },

    clothing: {
        type: "clothing",
        label: "Одежда",
        icon: "ti-shirt",
        color: "var(--color-node-clothing)",
        inputs: [],
        outputs: [],
        params: {
            selectedItem: "Tigran Avetisyan",
            name: "Tigran Avetisyan",
            photos: [] as string[],
            photoIdx: 0,
            season: "FW26",
            wear: 12,
        },
    },

    artwork: {
        type: "artwork",
        label: "Искусство",
        icon: "ti-palette",
        color: "var(--color-node-artwork)",
        inputs: [],
        outputs: [],
        params: {
            selectedItem: "Минас Аветисян",
            name: "Минас Аветисян",
            photos: [] as string[],
            photoIdx: 0,
            inFrame: true,
            scale: 120,
        },
    },

    furniture: {
        type: "furniture",
        label: "Мебель",
        icon: "ti-armchair",
        color: "var(--color-node-util)",
        inputs: [],
        outputs: [],
        params: {
            selectedItem: "Тахта + ковёр",
            name: "Тахта + ковёр",
            photos: [] as string[],
            photoIdx: 0,
            inFrame: true,
            density: 5,
        },
    },

    music: {
        type: "music",
        label: "Музыка",
        icon: "ti-music",
        color: "var(--color-node-scene)",
        inputs: [],
        outputs: [{ name: "Audio Out", type: PORT_TYPES.AUDIO }],
        params: {
            selectedItem: "Армянский дудук",
            name: "Армянский дудук",
            photos: [] as string[],
            photoIdx: 0,
            mood: "элегия",
        },
    },

    script: {
        type: "script",
        label: "Сценарий",
        icon: "ti-file-text",
        color: "var(--color-node-util)",
        inputs: [],
        outputs: [{ name: "Text Out", type: PORT_TYPES.TEXT }],
        params: {
            selectedItem: "Сцена 04: Утро в Конде",
            name: "Сцена 04: Утро в Конде",
            photos: [] as string[],
            photoIdx: 0,
            tone: "драма",
        },
    },

    storyboard: {
        type: "storyboard",
        label: "Раскадровка",
        icon: "ti-layout-board",
        color: "var(--color-node-higgsfield)",
        inputs: [],
        outputs: [{ name: "Image Out", type: PORT_TYPES.IMAGE }],
        params: {
            selectedItem: "Утро в Конде v4",
            name: "Утро в Конде v4",
            shots: 6,
        },
    },

    transport: {
        type: "transport",
        label: "Транспорт",
        icon: "ti-car",
        color: "var(--color-node-character)",
        inputs: [],
        outputs: [],
        params: {
            selectedItem: "Советский Москвич",
            name: "Советский Москвич",
            photos: [] as string[],
            photoIdx: 0,
            inFrame: false,
        },
    },
};

// Ordered list for NodeBrowser display
export const NODE_BROWSER_GROUPS: { label: string; types: string[] }[] = [
    {
        label: "Сущности",
        types: ["character", "location", "building", "clothing", "artwork", "furniture"],
    },
    { label: "Нарратив", types: ["music", "script", "storyboard", "transport", "mise_en_scene"] },
    { label: "Pinterest", types: ["pinterest_board"] },
    { label: "Higgsfield AI", types: ["higgsfield_soul", "higgsfield_camera", "higgsfield_speak"] },
    {
        label: "Gemini AI",
        types: [
            "gemini_text",
            "gemini_vision",
            "gemini_imagen",
            "gemini_veo",
            "gemini_nanobanana",
            "gemini_lyria",
        ],
    },
    { label: "Утилиты", types: ["text_prompt"] },
    { label: "Вывод", types: ["output_scene"] },
];
