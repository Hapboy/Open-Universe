import { z } from "zod";

// Mirrors NODE_TEMPLATES.gemini_nanobanana.params (data/nodes.ts) — see
// geminiImagen.schema.ts for the `.catch()` rationale.
export const geminiNanoBananaParamsSchema = z.object({
    prompt: z.string().catch(""),
    model: z.string().catch("gemini-3.1-flash-image"),
    aspectRatio: z.string().catch("16:9"),
    imageSize: z.string().catch("1K"),
    seed: z.string().catch(""),
    personGeneration: z.string().catch("ALLOW_ADULT"),
});

export type GeminiNanoBananaFormValues = z.infer<typeof geminiNanoBananaParamsSchema>;
