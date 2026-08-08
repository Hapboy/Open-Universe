import { z } from "zod";

// `model` has no fixed list at schema-definition time — it's fetched live via
// GeminiParams.tsx's useGeminiModels/geminiApiClient.listModels(), so unlike
// geminiImagen.schema.ts's IMAGEN_MODELS it stays an unconstrained string
// (same reasoning applies to geminiVision.schema.ts).
export const geminiTextParamsSchema = z.object({
    prompt: z.string(),
    model: z.string(),
});

export type GeminiTextFormValues = z.infer<typeof geminiTextParamsSchema>;

export const geminiTextDefaults: GeminiTextFormValues = {
    prompt: "",
    model: "gemini-flash-latest",
};
