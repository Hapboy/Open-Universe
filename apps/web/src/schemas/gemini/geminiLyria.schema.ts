import { z } from "zod";

// Mirrors NODE_TEMPLATES.gemini_lyria.params (data/nodes.ts) — see
// geminiImagen.schema.ts for the `.catch()` rationale.
export const geminiLyriaParamsSchema = z.object({
    prompt: z.string().catch(""),
    model: z.string().catch("lyria-3-clip-preview"),
    seed: z.string().catch(""),
});

export type GeminiLyriaFormValues = z.infer<typeof geminiLyriaParamsSchema>;
