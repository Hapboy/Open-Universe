import { z } from "zod";
import type { GeminiModel } from "@/core/api/gemini/dto.ts";

// See geminiImagen.schema.ts for the model-array/schema-derivation rationale.
export const NANO_BANANA_MODELS: readonly GeminiModel[] = [
    { id: "gemini-3.1-flash-image", displayName: "Nano Banana 2" },
    { id: "gemini-3-pro-image", displayName: "Nano Banana Pro" },
    { id: "gemini-2.5-flash-image", displayName: "Gemini 2.5 Flash Image" },
];
const NANO_BANANA_MODEL_IDS = NANO_BANANA_MODELS.map((m) => m.id) as [string, ...string[]];

export const geminiNanoBananaParamsSchema = z.object({
    prompt: z.string(),
    model: z.enum(NANO_BANANA_MODEL_IDS),
    aspectRatio: z.string(),
    imageSize: z.string(),
    seed: z.string(),
    // Vertex/Enterprise-only — see comment on GeminiNanoBananaParams in
    // GeminiParams.tsx.
    personGeneration: z.string(),
});

export type GeminiNanoBananaFormValues = z.infer<typeof geminiNanoBananaParamsSchema>;

export const geminiNanoBananaDefaults: GeminiNanoBananaFormValues = {
    prompt: "",
    model: NANO_BANANA_MODELS[0].id,
    aspectRatio: "16:9",
    imageSize: "1K",
    seed: "",
    personGeneration: "ALLOW_ADULT",
};

// Everything NanoBananaModelFields edits — i.e. the whole schema except the
// prompt, which every host sources differently (a wired pin on the standalone
// node, composed from connected entities in output_scene, composed from the
// entity itself on a character). The three hosts store this slice in three
// places (flat params / params.image / params.photoGen) but must never drift in
// *shape*, so both the schema and the defaults are derived here once: adding a
// Nano Banana param means editing this file, the shared field component, and the
// request mapper (core/api/gemini/dto.ts) — never the hosts.
export const nanoBananaSliceSchema = geminiNanoBananaParamsSchema.omit({ prompt: true });
export type NanoBananaSlice = z.infer<typeof nanoBananaSliceSchema>;

const { prompt: _prompt, ...sliceDefaults } = geminiNanoBananaDefaults;
export const nanoBananaSliceDefaults: NanoBananaSlice = sliceDefaults;
