import { z } from "zod";

// Mirrors NODE_TEMPLATES.gemini_veo.params (data/nodes.ts) — see
// geminiImagen.schema.ts for the `.catch()` rationale.
export const geminiVeoParamsSchema = z.object({
    prompt: z.string().catch(""),
    model: z.string().catch("veo-3.1-lite-generate-preview"),
    aspectRatio: z.string().catch("16:9"),
    resolution: z.string().catch("720p"),
    durationSeconds: z.number().catch(4),
    negativePrompt: z.string().catch(""),
    personGeneration: z.string().catch("allow_adult"),
    enhancePrompt: z.boolean().catch(true),
    seed: z.string().catch(""),
    generateAudio: z.boolean().catch(true),
});

export type GeminiVeoFormValues = z.infer<typeof geminiVeoParamsSchema>;
