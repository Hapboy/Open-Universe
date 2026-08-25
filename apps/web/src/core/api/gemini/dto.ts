export interface GeminiModel {
    id: string;
    displayName?: string;
}
export type ListModelsResponse = GeminiModel[];

export interface GenerateTextRequest {
    prompt: string;
    model?: string;
}
export type GenerateTextResponse = string | null;

export interface GenerateVisionRequest {
    imageUrl: string;
    query: string;
    model?: string;
}
export type GenerateVisionResponse = string | null;

// This app only ever reaches the Gemini Developer API (not Vertex AI
// "Enterprise" mode) — see apps/api/src/ai-gateway/gemini/gemini.service.ts
// for the Vertex-only fields intentionally omitted here (negativePrompt/
// seed/enhancePrompt/addWatermark/language for Imagen).
export interface GenerateImageRequest {
    prompt: string;
    aspectRatio: string;
    model: string;
    resolution: string;
    numberOfImages?: number;
    personGeneration?: string;
    safetyFilterLevel?: string;
    outputMimeType?: string;
    outputCompressionQuality?: number;
    guidanceScale?: number;
}
export type GenerateImageResponse = string | null;

export interface GenerateVideoRequest {
    prompt: string;
    imageUrl: string | null;
    model: string;
    aspectRatio: string;
    resolution: string;
    durationSeconds?: number;
    negativePrompt?: string;
    // Veo's personGeneration is a plain lowercase string ("dont_allow" |
    // "allow_adult"), unlike Imagen's uppercase value set.
    personGeneration?: string;
    enhancePrompt?: boolean;
}
export type GenerateVideoResponse = string | null;

// Nano Banana — generates images via generateContent (not Imagen's predict
// API), optionally seeded with reference images.
export interface GenerateImageFromRefsRequest {
    prompt: string;
    imageUrls: string[];
    model: string;
    aspectRatio?: string;
    imageSize?: string;
    seed?: number;
}

// Builds that request from a host's stored params slice (see
// nanoBananaSliceDefaults in schemas/gemini/geminiNanoBanana.schema.ts). All
// three hosts — the standalone node, output_scene's Картинка stage and a
// character's photo generation — keep the same field shape but hold it in
// different places and obtain prompt/reference images differently, so only
// those two travel as arguments. Lives next to the request type it constructs:
// a new Nano Banana param is added here once instead of in each caller.
//
// `seed` is an explicit argument rather than read from the slice because every
// caller resolves it first (reroll's +10000, or self-generating one when the
// field is blank — see core/seed.ts); it falls back to the slice's own value.
export function nanoBananaRequestFromSlice(
    slice: Record<string, unknown>,
    { prompt, imageUrls, seed }: { prompt: string; imageUrls: string[]; seed?: number },
): GenerateImageFromRefsRequest {
    const sliceSeed = slice.seed === "" || slice.seed == null ? undefined : Number(slice.seed);
    return {
        prompt,
        imageUrls,
        model: slice.model as string,
        aspectRatio: slice.aspectRatio as string,
        imageSize: slice.imageSize as string,
        seed: seed ?? sliceSeed,
    };
}
// Every image the model returned (Nano Banana can emit several inlineData
// parts for a prompt asking for variations), or null when the call failed /
// the provider isn't configured. Never an empty array — callers only need to
// distinguish "nothing came back" once.
export type GenerateImageFromRefsResponse = string[] | null;

// Lyria — generates music via generateContent + responseModalities: ["AUDIO"].
export interface GenerateAudioRequest {
    prompt: string;
    model: string;
    seed?: number;
}
export type GenerateAudioResponse = string | null;
