import { z } from "zod";

// Mirrors NODE_TEMPLATES.gemini_imagen.params (data/nodes.ts) — one field
// per key, `.catch()`ing back to the same default so an older saved scene
// missing a since-added key still parses instead of throwing.
export const geminiImagenParamsSchema = z.object({
    prompt: z.string().catch(""),
    model: z.string().catch("imagen-4.0-generate-001"),
    aspectRatio: z.string().catch("16:9"),
    resolution: z.string().catch("1K"),
    numberOfImages: z.number().catch(1),
    personGeneration: z.string().catch("ALLOW_ADULT"),
    safetyFilterLevel: z.string().catch("BLOCK_LOW_AND_ABOVE"),
    outputMimeType: z.string().catch("image/png"),
    outputCompressionQuality: z.number().catch(75),
    guidanceScale: z.string().catch(""),
    language: z.string().catch("auto"),
    negativePrompt: z.string().catch(""),
    seed: z.string().catch(""),
    enhancePrompt: z.boolean().catch(true),
});

export type GeminiImagenFormValues = z.infer<typeof geminiImagenParamsSchema>;
