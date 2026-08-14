import { DEFAULT_PINS } from "@/data/presets.ts";
import type { Port } from "@/types.ts";
import { PORT_TYPES, type NodeType } from "@hayverse/shared";
import { geminiNanoBananaDefaults } from "@/schemas/gemini/geminiNanoBanana.schema.ts";
import { geminiVeoDefaults } from "@/schemas/gemini/geminiVeo.schema.ts";

// Node types that call a paid AI generation service (GeminiService /
// HiggsfieldService) — these get a per-node Run button instead of
// auto-executing on every param change.
export const AI_MODEL_NODE_TYPES: readonly NodeType[] = [
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

// The 6 Gemini node types that keep a browsable per-node generation
// history (history/idx/paramsHistory in node.data.generation, persisted via
// graphExecution.ts's appendGeneratedRef) — the 3 Higgsfield types in
// AI_MODEL_NODE_TYPES above don't have this yet.
export const HISTORY_NODE_TYPES: Set<NodeType> = new Set([
    "gemini_text",
    "gemini_vision",
    "gemini_imagen",
    "gemini_veo",
    "gemini_nanobanana",
    "gemini_lyria",
]);

// Entity node types with the "rich" editing UI: a toggleable prompt column
// for additionalDescription, and Description/JSON output pins (instead of a
// plain selectedItem passthrough).
export const RICH_ENTITY_NODE_TYPES: Set<NodeType> = new Set([
    "character",
    "location",
    "mise_en_scene",
]);

// All entity node types with a preset (`PresetsField`) picker — the
// shared source of truth for both the "selectedItem passthrough" fallback
// and the photo-gallery gating in core/graph.ts and GraphContext.tsx.
export const ENTITY_NODE_TYPES: Set<NodeType> = new Set([
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
    type: NodeType;
    label: string;
    icon: string;
    color: string;
    inputs: Omit<Port, "id">[];
    outputs: Omit<Port, "id">[];
    // Optional: the 11 entity types (character..transport) no longer carry
    // their defaults here — see EntityParams/schemas.ts's per-type
    // `*Defaults` objects, sourced by GraphContext.tsx's templateParams.
    params?: Record<string, unknown>;
}

export const NODE_TEMPLATES = {
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
        // Defaults now come from schemas/gemini/geminiText.schema.ts's
        // geminiTextDefaults — see GraphContext.tsx's templateParams.
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
        // Defaults now come from schemas/gemini/geminiVision.schema.ts's
        // geminiVisionDefaults — see GraphContext.tsx's templateParams.
    },

    gemini_imagen: {
        type: "gemini_imagen",
        label: "Imagen 4",
        icon: "ti-photo-ai",
        color: "#4285F4",
        inputs: [{ name: "Style Prompt", type: PORT_TYPES.TEXT }],
        outputs: [{ name: "Generated Image", type: PORT_TYPES.IMAGE }],
        // Defaults now come from schemas/gemini/geminiImagen.schema.ts's
        // geminiImagenDefaults — see GraphContext.tsx's templateParams.
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
        // Defaults now come from schemas/gemini/geminiVeo.schema.ts's
        // geminiVeoDefaults — see GraphContext.tsx's templateParams.
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
        // Defaults now come from schemas/gemini/geminiNanoBanana.schema.ts's
        // geminiNanoBananaDefaults — see GraphContext.tsx's templateParams.
    },

    gemini_lyria: {
        type: "gemini_lyria",
        label: "Lyria Music",
        icon: "ti-music-bolt",
        color: "#4285F4",
        inputs: [{ name: "Prompt", type: PORT_TYPES.TEXT }],
        outputs: [{ name: "Generated Audio", type: PORT_TYPES.AUDIO }],
        // Defaults now come from schemas/gemini/geminiLyria.schema.ts's
        // geminiLyriaDefaults — see GraphContext.tsx's templateParams.
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
        outputs: [],
        params: {
            title: "",
            start: 0,
            duration: 5,
            track: 1,
            coverUrl: "",
            activeOutput: "video",
            // "llm" runs a text-model pass over the connected entities' JSON
            // to write a natural-language prompt; "raw" sends their
            // serialized JSON straight through as the prompt — a dev toggle
            // to compare both, see core/scenePrompt.ts.
            promptComposition: "llm",
            // Free-text, user-authored addition to the composed prompt — same
            // role as character/location's additionalDescription (see
            // EntityParams.tsx), edited via the same promptPanelOpen side
            // panel (NodeCard.tsx). Prepended before the entity-composed
            // prompt at generation time (core/scenePrompt.ts's
            // composeScenePrompt), not merged into `image`/`video` since it
            // applies to both stages equally.
            additionalDescription: "",
            // image/video hold pure generation config only — model,
            // aspectRatio, seed, etc, exactly what a preset snapshot should
            // capture (buildPresetSnapshot only ever looks at `params`, see
            // types.ts). Generation history/bookkeeping (history/idx/
            // paramsHistory/lastComposedPrompt) lives in the sibling
            // node.data.generation.image/.video instead — absent until this
            // node's first generation, same as every other node's
            // data.generation (see types.ts's doc comment).
            image: {
                model: geminiNanoBananaDefaults.model,
                aspectRatio: geminiNanoBananaDefaults.aspectRatio,
                imageSize: geminiNanoBananaDefaults.imageSize,
                seed: geminiNanoBananaDefaults.seed,
                personGeneration: geminiNanoBananaDefaults.personGeneration,
            },
            video: {
                model: geminiVeoDefaults.model,
                aspectRatio: geminiVeoDefaults.aspectRatio,
                resolution: geminiVeoDefaults.resolution,
                durationSeconds: geminiVeoDefaults.durationSeconds,
                negativePrompt: geminiVeoDefaults.negativePrompt,
                personGeneration: geminiVeoDefaults.personGeneration,
                enhancePrompt: geminiVeoDefaults.enhancePrompt,
                seed: geminiVeoDefaults.seed,
                generateAudio: geminiVeoDefaults.generateAudio,
            },
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
        color: "var(--color-node-character)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
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
    },

    mise_en_scene: {
        type: "mise_en_scene",
        label: "Мизансцена",
        icon: "ti-users",
        color: "var(--color-node-mise-en-scene)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },

    building: {
        type: "building",
        label: "Здание",
        icon: "ti-building-arch",
        color: "var(--color-node-building)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },

    clothing: {
        type: "clothing",
        label: "Одежда",
        icon: "ti-shirt",
        color: "var(--color-node-clothing)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },

    artwork: {
        type: "artwork",
        label: "Искусство",
        icon: "ti-palette",
        color: "var(--color-node-artwork)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },

    furniture: {
        type: "furniture",
        label: "Мебель",
        icon: "ti-armchair",
        color: "var(--color-node-furniture)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },

    music: {
        type: "music",
        label: "Музыка",
        icon: "ti-music",
        color: "var(--color-node-music)",
        inputs: [],
        outputs: [
            { name: "Audio Out", type: PORT_TYPES.AUDIO },
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },

    script: {
        type: "script",
        label: "Сценарий",
        icon: "ti-file-text",
        color: "var(--color-node-script)",
        inputs: [],
        outputs: [
            { name: "Text Out", type: PORT_TYPES.TEXT },
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },

    storyboard: {
        type: "storyboard",
        label: "Раскадровка",
        icon: "ti-layout-board",
        color: "var(--color-node-storyboard)",
        inputs: [],
        outputs: [
            { name: "Image Out", type: PORT_TYPES.IMAGE },
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },

    transport: {
        type: "transport",
        label: "Транспорт",
        icon: "ti-car",
        color: "var(--color-node-transport)",
        inputs: [],
        outputs: [
            { name: "Description", type: PORT_TYPES.TEXT },
            { name: "JSON", type: PORT_TYPES.TEXT },
        ],
    },
} satisfies Record<NodeType, NodeTemplate>;

// Ordered list for NodeBrowser display
export const NODE_BROWSER_GROUPS: { label: string; types: NodeType[] }[] = [
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
