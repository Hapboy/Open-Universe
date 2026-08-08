import { z } from "zod";
import type { GeminiModel } from "../../core/api/gemini/dto.ts";

// See geminiImagen.schema.ts for the model-array/schema-derivation rationale.
export const VEO_MODELS: readonly GeminiModel[] = [
    { id: "veo-3.1-generate-preview", displayName: "Veo 3.1" },
    { id: "veo-3.1-fast-generate-preview", displayName: "Veo 3.1 Fast" },
    { id: "veo-3.1-lite-generate-preview", displayName: "Veo 3.1 Lite" },
];
const VEO_MODEL_IDS = VEO_MODELS.map((m) => m.id) as [string, ...string[]];

export const geminiVeoParamsSchema = z.object({
    prompt: z.string(),
    model: z.enum(VEO_MODEL_IDS),
    aspectRatio: z.string(),
    resolution: z.string(),
    durationSeconds: z.number(),
    negativePrompt: z.string(),
    // Veo's personGeneration is a plain lowercase string ("dont_allow" |
    // "allow_adult"), unlike Imagen's uppercase value set — see
    // GeminiParams.tsx's VEO_PERSON_GENERATION_OPTIONS.
    personGeneration: z.string(),
    enhancePrompt: z.boolean(),
    // Vertex/Enterprise-only fields — see comment on GeminiVeoParams in
    // GeminiParams.tsx.
    seed: z.string(),
    generateAudio: z.boolean(),
});

export type GeminiVeoFormValues = z.infer<typeof geminiVeoParamsSchema>;

export const geminiVeoDefaults: GeminiVeoFormValues = {
    prompt: "",
    model: VEO_MODELS[2].id,
    aspectRatio: "16:9",
    resolution: "720p",
    durationSeconds: 4,
    negativePrompt: "",
    personGeneration: "allow_adult",
    enhancePrompt: true,
    seed: "",
    generateAudio: true,
};
