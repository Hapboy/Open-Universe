import { z } from "zod";

// Mirrors NODE_TEMPLATES.gemini_vision.params (data/nodes.ts) — see
// geminiImagen.schema.ts for the `.catch()` rationale.
export const geminiVisionParamsSchema = z.object({
    query: z.string().catch("Describe this scene for a film"),
    model: z.string().catch("gemini-flash-latest"),
});

export type GeminiVisionFormValues = z.infer<typeof geminiVisionParamsSchema>;
