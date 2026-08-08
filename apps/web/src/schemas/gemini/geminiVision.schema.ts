import { z } from "zod";

// See geminiText.schema.ts — `model` is fetched live, no fixed enum here.
export const geminiVisionParamsSchema = z.object({
    query: z.string(),
    model: z.string(),
});

export type GeminiVisionFormValues = z.infer<typeof geminiVisionParamsSchema>;

export const geminiVisionDefaults: GeminiVisionFormValues = {
    query: "Describe this scene for a film",
    model: "gemini-flash-latest",
};
