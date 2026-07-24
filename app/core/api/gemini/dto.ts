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
// "Enterprise" mode) — see core/services/gemini.ts for the Vertex-only
// fields intentionally omitted here (negativePrompt/seed/enhancePrompt/
// addWatermark/language for Imagen).
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
export type GenerateImageFromRefsResponse = string | null;

// Lyria — generates music via generateContent + responseModalities: ["AUDIO"].
export interface GenerateAudioRequest {
    prompt: string;
    model: string;
    seed?: number;
}
export type GenerateAudioResponse = string | null;
