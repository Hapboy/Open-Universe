import { z } from "zod";
import type { GeminiModel } from "@/core/api/gemini/dto.ts";

// See geminiImagen.schema.ts for the model-array/schema-derivation rationale.
export const LYRIA_MODELS: readonly GeminiModel[] = [
    { id: "lyria-3-clip-preview", displayName: "Lyria 3 Clip" },
    { id: "lyria-3-pro-preview", displayName: "Lyria 3 Pro" },
];
const LYRIA_MODEL_IDS = LYRIA_MODELS.map((m) => m.id) as [string, ...string[]];

export const geminiLyriaParamsSchema = z.object({
    prompt: z.string(),
    model: z.enum(LYRIA_MODEL_IDS),
    seed: z.string(),
    // See geminiNanoBanana.schema.ts's randomizeSeed doc comment.
    randomizeSeed: z.boolean(),
});

export type GeminiLyriaFormValues = z.infer<typeof geminiLyriaParamsSchema>;

export const geminiLyriaDefaults: GeminiLyriaFormValues = {
    prompt: "",
    model: LYRIA_MODELS[0].id,
    seed: "",
    randomizeSeed: true,
};
