// Adapter over apps/api's AiGatewayModule (Ai Gateway Phase G.5 — see
// docs/backend-bootstrap.md), via @hayverse/api-client's `gemini` namespace.
// This file owns only the frontend-specific concerns: toasts, the 501 (not
// configured) -> mock-value fallback, and converting browser-local
// blob:/idb:/gen: refs to base64 before they leave the client — the typed
// HTTP calls themselves live in packages/api-client, same as scenes/media/
// presets/jobs.
//
// 501 replaces the old build-time isProviderConfigured("gemini") gate: the
// key now lives in apps/api, not on Vercel, so it can't be known
// synchronously anymore — every method just attempts the real call and
// catches ApiError to tell "not configured" apart from any other failure.
import { ApiError } from "@hayverse/api-client";
import { hayverseApiClient } from "../hayverse/client.ts";
import { pollJob } from "../pollJob.ts";
import type {
    ListModelsResponse,
    GeminiModel,
    GenerateTextRequest,
    GenerateTextResponse,
    GenerateVisionRequest,
    GenerateVisionResponse,
    GenerateImageRequest,
    GenerateImageResponse,
    GenerateVideoRequest,
    GenerateVideoResponse,
    GenerateImageFromRefsRequest,
    GenerateImageFromRefsResponse,
    GenerateAudioRequest,
    GenerateAudioResponse,
} from "./dto.ts";

type ShowToast = (msg: string) => void;

let modelsCache: GeminiModel[] | null = null;

function isNotConfigured(e: unknown): boolean {
    return e instanceof ApiError && e.status === 501;
}

async function urlToBase64(url: string): Promise<string> {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(new Blob([buf]));
    });
}

export interface GeminiApiClient {
    listModels(): Promise<ListModelsResponse>;
    generateText(req: GenerateTextRequest, showToast: ShowToast): Promise<GenerateTextResponse>;
    generateVision(
        req: GenerateVisionRequest,
        showToast: ShowToast,
    ): Promise<GenerateVisionResponse>;
    generateImage(req: GenerateImageRequest, showToast: ShowToast): Promise<GenerateImageResponse>;
    generateVideo(req: GenerateVideoRequest, showToast: ShowToast): Promise<GenerateVideoResponse>;
    generateImageFromRefs(
        req: GenerateImageFromRefsRequest,
        showToast: ShowToast,
    ): Promise<GenerateImageFromRefsResponse>;
    generateAudio(req: GenerateAudioRequest, showToast: ShowToast): Promise<GenerateAudioResponse>;
}

export const geminiApiClient: GeminiApiClient = {
    async listModels() {
        if (modelsCache) return modelsCache;
        try {
            const { models } = await hayverseApiClient.gemini.listModels();
            modelsCache = models;
            return modelsCache;
        } catch (e) {
            console.warn("Gemini listModels error:", e);
            return [];
        }
    },

    async generateText(req, showToast) {
        try {
            showToast("Gemini: генерация текста…");
            const { text } = await hayverseApiClient.gemini.generateText(req);
            showToast("Gemini: текст готов");
            return text;
        } catch (e) {
            if (isNotConfigured(e)) {
                showToast("Gemini Text: mock режим");
                return `[Gemini mock] ${req.prompt}`;
            }
            console.warn("Gemini Text error:", e);
            showToast("Gemini Text: ошибка API");
            return null;
        }
    },

    async generateVision(req, showToast) {
        try {
            showToast("Gemini Vision: анализ изображения…");
            const imageBase64 = await urlToBase64(req.imageUrl);
            const { text } = await hayverseApiClient.gemini.generateVision({
                imageBase64,
                query: req.query,
                model: req.model,
            });
            showToast("Gemini Vision: описание готово");
            return text;
        } catch (e) {
            if (isNotConfigured(e)) {
                showToast("Gemini Vision: mock режим");
                return "[Gemini mock] Scene with Armenian aesthetic, warm light, cinematic composition.";
            }
            console.warn("Gemini Vision error:", e);
            showToast("Gemini Vision: ошибка API");
            return null;
        }
    },

    async generateImage(req, showToast) {
        try {
            showToast("Imagen 4: генерация кадра…");
            const options = {
                aspectRatio: req.aspectRatio,
                model: req.model,
                resolution: req.resolution,
                numberOfImages: req.numberOfImages,
                personGeneration: req.personGeneration,
                safetyFilterLevel: req.safetyFilterLevel,
                outputMimeType: req.outputMimeType,
                outputCompressionQuality: req.outputCompressionQuality,
                guidanceScale: req.guidanceScale,
            };
            const result = await hayverseApiClient.gemini.generateImagen({
                prompt: req.prompt,
                options,
            });
            if (!result.ok) {
                showToast(
                    result.reason
                        ? `Imagen 4: изображение отклонено (safety-фильтр): ${result.reason}`
                        : "Imagen 4: пустой ответ — изображение отклонено фильтром безопасности",
                );
                console.warn("Imagen 4: filtered, no image bytes", result.reason);
                return null;
            }
            showToast("Imagen 4: изображение готово!");
            return result.dataUrl;
        } catch (e) {
            if (isNotConfigured(e)) {
                showToast("Imagen 4: mock режим");
                return null;
            }
            console.warn("Imagen 4 error:", e);
            showToast("Imagen 4: ошибка API");
            return null;
        }
    },

    async generateVideo(req, showToast) {
        try {
            showToast("Veo: запуск генерации видео…");
            const imageBase64 = req.imageUrl ? await urlToBase64(req.imageUrl) : null;
            const options = {
                model: req.model,
                aspectRatio: req.aspectRatio,
                resolution: req.resolution,
                durationSeconds: req.durationSeconds,
                negativePrompt: req.negativePrompt,
                personGeneration: req.personGeneration,
                enhancePrompt: req.enhancePrompt,
            };
            const { jobId } = await hayverseApiClient.gemini.generateVeo({
                prompt: req.prompt,
                imageBase64,
                options,
            });
            showToast("Veo: рендеринг (может занять несколько минут)…");
            const dataUrl = await pollJob<string>(jobId, "dataUrl");
            showToast("Veo: видео готово!");
            return dataUrl;
        } catch (e) {
            if (isNotConfigured(e)) {
                showToast("Veo: mock режим");
                return null;
            }
            console.warn("Veo error:", e);
            showToast("Veo: ошибка API");
            return null;
        }
    },

    async generateImageFromRefs(req, showToast) {
        try {
            showToast("Nano Banana: генерация изображения…");
            const imageBase64List = await Promise.all(req.imageUrls.map(urlToBase64));
            const options = {
                model: req.model,
                aspectRatio: req.aspectRatio,
                imageSize: req.imageSize,
                seed: req.seed,
            };
            const { dataUrl } = await hayverseApiClient.gemini.generateNanoBanana({
                prompt: req.prompt,
                imageBase64List,
                options,
            });
            showToast("Nano Banana: изображение готово!");
            return dataUrl;
        } catch (e) {
            if (isNotConfigured(e)) {
                showToast("Nano Banana: mock режим");
                return null;
            }
            console.warn("Nano Banana error:", e);
            showToast("Nano Banana: ошибка API");
            return null;
        }
    },

    async generateAudio(req, showToast) {
        try {
            showToast("Lyria: генерация музыки…");
            const options = { model: req.model, seed: req.seed };
            const { dataUrl } = await hayverseApiClient.gemini.generateLyria({
                prompt: req.prompt,
                options,
            });
            showToast("Lyria: музыка готова!");
            return dataUrl;
        } catch (e) {
            if (isNotConfigured(e)) {
                showToast("Lyria: mock режим");
                return null;
            }
            console.warn("Lyria error:", e);
            showToast("Lyria: ошибка API");
            return null;
        }
    },
};
