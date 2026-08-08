import { z } from "zod";

// Mirrors NODE_TEMPLATES.gemini_text.params (data/nodes.ts) — see
// geminiImagen.schema.ts for the `.catch()` rationale.
export const geminiTextParamsSchema = z.object({
    prompt: z.string().catch(""),
    model: z.string().catch("gemini-flash-latest"),
});

export type GeminiTextFormValues = z.infer<typeof geminiTextParamsSchema>;
