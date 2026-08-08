import { z } from "zod";
import type { GeminiModel } from "@/core/api/gemini/dto.ts";

// See geminiImagen.schema.ts for the model-array/schema-derivation rationale.
export const NANO_BANANA_MODELS: readonly GeminiModel[] = [
    { id: "gemini-3.1-flash-image", displayName: "Nano Banana 2" },
    { id: "gemini-3-pro-image", displayName: "Nano Banana Pro" },
    { id: "gemini-2.5-flash-image", displayName: "Gemini 2.5 Flash Image" },
];
const NANO_BANANA_MODEL_IDS = NANO_BANANA_MODELS.map((m) => m.id) as [string, ...string[]];

export const geminiNanoBananaParamsSchema = z.object({
    prompt: z.string(),
    model: z.enum(NANO_BANANA_MODEL_IDS),
    aspectRatio: z.string(),
    imageSize: z.string(),
    seed: z.string(),
    // Vertex/Enterprise-only — see comment on GeminiNanoBananaParams in
    // GeminiParams.tsx.
    personGeneration: z.string(),
});

export type GeminiNanoBananaFormValues = z.infer<typeof geminiNanoBananaParamsSchema>;

export const geminiNanoBananaDefaults: GeminiNanoBananaFormValues = {
    prompt: "",
    model: NANO_BANANA_MODELS[0].id,
    aspectRatio: "16:9",
    imageSize: "1K",
    seed: "",
    personGeneration: "ALLOW_ADULT",
};
