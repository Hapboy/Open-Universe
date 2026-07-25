import { GoogleGenAI } from "@google/genai";
import type { PersonGeneration, SafetyFilterLevel } from "@google/genai";

// Server-only from here on — reachable only from app/api/gemini/*/route.ts, which
// hold the real key. Mock/fallback data, the "no key configured" branch, toast
// messaging, and the modelsCache all live client-side in core/api/gemini/client.ts
// now. Image inputs arrive here as base64, not a URL: the browser-local
// blob:/idb:/gen: refs these come from aren't fetchable from the server, so the
// client.ts adapter converts to base64 before calling the route.

export interface GeminiModelInfo {
    id: string;
    displayName?: string;
}

// This app only ever creates GoogleGenAI({ apiKey }) — the Gemini Developer API,
// not Vertex AI's "Enterprise" mode. Several GenerateImages/GenerateVideos config
// fields are Vertex-only and throw client-side or server-side (400) in Developer
// API mode: for Imagen that's negativePrompt/seed/enhancePrompt/addWatermark/
// language ("Setting language is not supported", confirmed live even with the
// default "auto"), for Veo it's seed/generateAudio. They're intentionally
// omitted from these option types.
export interface ImagenOptions {
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

export interface VeoOptions {
    model: string;
    aspectRatio: string;
    resolution: string;
    durationSeconds?: number;
    negativePrompt?: string;
    // Veo's personGeneration is a plain lowercase string ('dont_allow' | 'allow_adult'),
    // unlike Imagen's uppercase PersonGeneration enum — no 'allow_all' option for video.
    personGeneration?: string;
    enhancePrompt?: boolean;
}

// Nano Banana (gemini-*-image models) generates images via generateContent, not
// Imagen's predict API — a different config shape (ImageConfig) with its own
// Vertex-only field: personGeneration throws client-side in Developer API mode
// here too ("only supported in Gemini Enterprise Agent Platform mode"), confirmed
// live. aspectRatio/imageSize/seed all work fine in Developer API.
export interface NanoBananaOptions {
    model: string;
    aspectRatio?: string;
    imageSize?: string;
    seed?: number;
}

// Lyria (lyria-3-*-preview) generates music via generateContent + responseModalities:
// ['AUDIO'] — confirmed live it returns a directly playable audio/mpeg (MP3) inlineData
// part, no PCM/WAV header wrangling needed. candidateCount > 1 is rejected by the API
// ("Multiple candidates is not enabled for this model"), so no multi-track option.
export interface LyriaOptions {
    model: string;
    seed?: number;
}

export type ImagenResult = { ok: true; dataUrl: string } | { ok: false; reason?: string };

const DEFAULT_MODEL = "gemini-flash-latest";

function ai(key: string) {
    return new GoogleGenAI({ apiKey: key });
}

export const GeminiService = {
    async listModels(key: string): Promise<GeminiModelInfo[]> {
        const pager = await ai(key).models.list({ config: { pageSize: 100 } });
        const models: GeminiModelInfo[] = [];
        for await (const m of pager) {
            if (!m.name || !m.supportedActions?.includes("generateContent")) continue;
            models.push({ id: m.name.replace(/^models\//, ""), displayName: m.displayName });
        }
        return models;
    },

    async runText(
        prompt: string,
        key: string,
        model: string = DEFAULT_MODEL,
    ): Promise<string | null> {
        const res = await ai(key).models.generateContent({
            model: model || DEFAULT_MODEL,
            contents: prompt,
        });
        return res.text ?? null;
    },

    async runVision(
        imageBase64: string,
        query: string,
        key: string,
        model: string = DEFAULT_MODEL,
    ): Promise<string | null> {
        const res = await ai(key).models.generateContent({
            model: model || DEFAULT_MODEL,
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: query },
                        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
                    ],
                },
            ],
        });
        return res.text ?? null;
    },

    async runImagen(prompt: string, options: ImagenOptions, key: string): Promise<ImagenResult> {
        const model = options.model || "imagen-4.0-generate-001";
        // Imagen 4 Fast has a fixed output size and rejects imageSize outright
        // ("sampleImageSize is not adjustable") — only Standard/Ultra support it.
        const supportsImageSize = model !== "imagen-4.0-fast-generate-001";
        const res = await ai(key).models.generateImages({
            model,
            prompt,
            config: {
                numberOfImages: options.numberOfImages ?? 1,
                aspectRatio: options.aspectRatio,
                imageSize: supportsImageSize ? options.resolution : undefined,
                personGeneration: options.personGeneration as PersonGeneration,
                safetyFilterLevel: options.safetyFilterLevel as SafetyFilterLevel,
                outputMimeType: options.outputMimeType,
                outputCompressionQuality:
                    options.outputMimeType === "image/jpeg"
                        ? options.outputCompressionQuality
                        : undefined,
                guidanceScale: options.guidanceScale,
                includeRaiReason: true,
            },
        });
        const first = res.generatedImages?.[0];
        const bytes = first?.image?.imageBytes;
        if (!bytes) {
            // Imagen's child-safety/RAI policy can silently drop the image and
            // still return HTTP 200 — indistinguishable from a real failure
            // unless includeRaiReason is set and surfaced here.
            return { ok: false, reason: first?.raiFilteredReason };
        }
        return { ok: true, dataUrl: `data:image/png;base64,${bytes}` };
    },

    async runVeo(
        prompt: string,
        imageBase64: string | null,
        options: VeoOptions,
        key: string,
    ): Promise<string> {
        const client = ai(key);
        const image = imageBase64 ? { imageBytes: imageBase64, mimeType: "image/jpeg" } : undefined;
        const resolution = options.resolution ?? "720p";
        // 1080p/4k generations must be exactly 8s across every veo-3.1-*-preview
        // model (confirmed in ai.google.dev/gemini-api/docs/veo) — clamp rather
        // than let the API reject a shorter duration picked at 720p.
        const durationSeconds = resolution !== "720p" ? 8 : (options.durationSeconds ?? 8);
        let operation = await client.models.generateVideos({
            model: options.model || "veo-3.1-generate-preview",
            prompt,
            image,
            config: {
                numberOfVideos: 1,
                aspectRatio: options.aspectRatio,
                resolution,
                durationSeconds,
                negativePrompt: options.negativePrompt || undefined,
                // personGeneration and enhancePrompt are both rejected ("currently not
                // supported" / "not supported by this model") by every veo-3.1-*-preview
                // model available on this key right now — omitted, not just Vertex-gated.
            },
        });
        // No progress fraction from the API — poll every 10s, capped at 5 min like HiggsfieldService's hfPoll.
        for (let i = 0; i < 30 && !operation.done; i++) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            operation = await client.operations.getVideosOperation({ operation });
        }
        const video = operation.response?.generatedVideos?.[0]?.video;
        if (!video) throw new Error("no video in response");
        if (video.videoBytes)
            return `data:${video.mimeType ?? "video/mp4"};base64,${video.videoBytes}`;
        if (video.uri) {
            // ai.files.download() is Node-only-friendly here too, but the file URI
            // still needs the API key appended per the SDK's own doc comment — safe
            // to do server-side since the key never leaves this process.
            const sep = video.uri.includes("?") ? "&" : "?";
            const res = await fetch(`${video.uri}${sep}key=${key}`);
            if (!res.ok) throw new Error(`video download HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            const base64 = Buffer.from(buf).toString("base64");
            return `data:${video.mimeType ?? "video/mp4"};base64,${base64}`;
        }
        throw new Error("no video uri or bytes");
    },

    async runNanoBanana(
        prompt: string,
        imageBase64List: string[],
        options: NanoBananaOptions,
        key: string,
    ): Promise<string> {
        const contents = imageBase64List.length
            ? [
                  {
                      role: "user",
                      parts: [
                          { text: prompt },
                          ...imageBase64List.map((data) => ({
                              inlineData: { mimeType: "image/jpeg", data },
                          })),
                      ],
                  },
              ]
            : prompt;
        const res = await ai(key).models.generateContent({
            model: options.model || "gemini-3.1-flash-image",
            contents,
            config: {
                responseModalities: ["IMAGE"],
                imageConfig: { aspectRatio: options.aspectRatio, imageSize: options.imageSize },
                seed: options.seed,
            },
        });
        const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        if (!part?.inlineData?.data) throw new Error("no image in response");
        return `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`;
    },

    async runLyria(prompt: string, options: LyriaOptions, key: string): Promise<string> {
        const res = await ai(key).models.generateContent({
            model: options.model || "lyria-3-clip-preview",
            contents: prompt,
            config: { responseModalities: ["AUDIO"], seed: options.seed },
        });
        const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        if (!part?.inlineData?.data) throw new Error("no audio in response");
        return `data:${part.inlineData.mimeType ?? "audio/mpeg"};base64,${part.inlineData.data}`;
    },
};
