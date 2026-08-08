import { z } from "zod";
import type { GeminiModel } from "../../core/api/gemini/dto.ts";

// Single source for both the schema's model enum/default and
// GeminiParams.tsx's model <select> options (modelOptions(IMAGEN_MODELS)) —
// same "don't duplicate a known constant" principle as entity schemas'
// optionalEnum off @hayverse/shared's `as const` arrays.
export const IMAGEN_MODELS: readonly GeminiModel[] = [
    { id: "imagen-4.0-generate-001", displayName: "Imagen 4" },
    { id: "imagen-4.0-ultra-generate-001", displayName: "Imagen 4 Ultra" },
    { id: "imagen-4.0-fast-generate-001", displayName: "Imagen 4 Fast" },
];
const IMAGEN_MODEL_IDS = IMAGEN_MODELS.map((m) => m.id) as [string, ...string[]];

// Every field below used to be `.catch(default)` (see git history), which
// swallows validation failures by design — zodResolver could never produce
// an error for any of them, regardless of `mode`. Now strict: real
// `.min()`/`.max()`/enum constraints where the UI itself already implies one
// (numberOfImages' select is "1"-"4", outputCompressionQuality's label says
// "0-100", model is one of IMAGEN_MODELS), plain otherwise — most fields
// here don't have a real constraint, same as most entity fields didn't.
export const geminiImagenParamsSchema = z.object({
    prompt: z.string(),
    model: z.enum(IMAGEN_MODEL_IDS),
    aspectRatio: z.string(),
    resolution: z.string(),
    numberOfImages: z.number().min(1).max(4),
    personGeneration: z.string(),
    safetyFilterLevel: z.string(),
    outputMimeType: z.string(),
    outputCompressionQuality: z.number().min(0, "Минимум 0").max(100, "Максимум 100"),
    guidanceScale: z.string(),
    // Vertex/Enterprise-only fields — see comment on GeminiImagenParams in
    // GeminiParams.tsx. Left unconstrained/disabled until a backend proxy
    // adds Vertex support.
    language: z.string(),
    negativePrompt: z.string(),
    seed: z.string(),
    enhancePrompt: z.boolean(),
});

export type GeminiImagenFormValues = z.infer<typeof geminiImagenParamsSchema>;

export const geminiImagenDefaults: GeminiImagenFormValues = {
    prompt: "",
    model: IMAGEN_MODELS[0].id,
    aspectRatio: "16:9",
    resolution: "1K",
    numberOfImages: 1,
    personGeneration: "ALLOW_ADULT",
    safetyFilterLevel: "BLOCK_LOW_AND_ABOVE",
    outputMimeType: "image/png",
    outputCompressionQuality: 75,
    guidanceScale: "",
    language: "auto",
    negativePrompt: "",
    seed: "",
    enhancePrompt: true,
};
