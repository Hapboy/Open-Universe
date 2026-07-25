// Adapter over app/api/gemini/*/route.ts (the real key lives server-only there
// now — see core/services/gemini.ts). This is the seam a generated Swagger
// client swaps into later — call sites depend on this interface, not on the
// route shape directly. Mock/fallback behavior below is ported verbatim from the
// pre-Phase-3 client-side GeminiService: same toasts, same fallback text/values,
// just gated on isProviderConfigured() instead of a client-visible key check.
//
// imageUrl(s) can be blob:/idb:/gen: browser-local refs, only valid in this tab —
// not fetchable from the server. urlToBase64 converts them here, client-side,
// before the request; the routes receive base64 image data, never a URL.
import { isProviderConfigured } from "../env.ts";
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

const FALLBACK_MODELS: GeminiModel[] = [
    { id: "gemini-flash-latest", displayName: "Gemini Flash (latest)" },
    { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
];

let modelsCache: GeminiModel[] | null = null;

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
        if (!isProviderConfigured("gemini")) return FALLBACK_MODELS;
        if (modelsCache) return modelsCache;
        try {
            const res = await fetch("/api/gemini/models");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { models } = (await res.json()) as { models: GeminiModel[] };
            modelsCache = models.length ? models : FALLBACK_MODELS;
            return modelsCache;
        } catch (e) {
            console.warn("Gemini listModels error:", e);
            return FALLBACK_MODELS;
        }
    },

    async generateText(req, showToast) {
        if (!isProviderConfigured("gemini")) {
            showToast("Gemini Text: mock режим");
            return `[Gemini mock] ${req.prompt}`;
        }
        try {
            showToast("Gemini: генерация текста…");
            const res = await fetch("/api/gemini/text", {
                method: "POST",
                body: JSON.stringify(req),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { text } = (await res.json()) as { text: string | null };
            showToast("Gemini: текст готов");
            return text;
        } catch (e) {
            console.warn("Gemini Text error:", e);
            showToast("Gemini Text: ошибка API");
            return null;
        }
    },

    async generateVision(req, showToast) {
        if (!isProviderConfigured("gemini")) {
            showToast("Gemini Vision: mock режим");
            return "[Gemini mock] Scene with Armenian aesthetic, warm light, cinematic composition.";
        }
        try {
            showToast("Gemini Vision: анализ изображения…");
            const imageBase64 = await urlToBase64(req.imageUrl);
            const res = await fetch("/api/gemini/vision", {
                method: "POST",
                body: JSON.stringify({ imageBase64, query: req.query, model: req.model }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { text } = (await res.json()) as { text: string | null };
            showToast("Gemini Vision: описание готово");
            return text;
        } catch (e) {
            console.warn("Gemini Vision error:", e);
            showToast("Gemini Vision: ошибка API");
            return null;
        }
    },

    async generateImage(req, showToast) {
        if (!isProviderConfigured("gemini")) {
            showToast("Imagen 4: mock режим");
            return null;
        }
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
            const res = await fetch("/api/gemini/imagen", {
                method: "POST",
                body: JSON.stringify({ prompt: req.prompt, options }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = (await res.json()) as
                { ok: true; dataUrl: string } | { ok: false; reason?: string };
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
            console.warn("Imagen 4 error:", e);
            showToast("Imagen 4: ошибка API");
            return null;
        }
    },

    async generateVideo(req, showToast) {
        if (!isProviderConfigured("gemini")) {
            showToast("Veo: mock режим");
            return null;
        }
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
            showToast("Veo: рендеринг (может занять несколько минут)…");
            const res = await fetch("/api/gemini/veo", {
                method: "POST",
                body: JSON.stringify({ prompt: req.prompt, imageBase64, options }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { dataUrl } = (await res.json()) as { dataUrl: string };
            showToast("Veo: видео готово!");
            return dataUrl;
        } catch (e) {
            console.warn("Veo error:", e);
            showToast("Veo: ошибка API");
            return null;
        }
    },

    async generateImageFromRefs(req, showToast) {
        if (!isProviderConfigured("gemini")) {
            showToast("Nano Banana: mock режим");
            return null;
        }
        try {
            showToast("Nano Banana: генерация изображения…");
            const imageBase64List = await Promise.all(req.imageUrls.map(urlToBase64));
            const options = {
                model: req.model,
                aspectRatio: req.aspectRatio,
                imageSize: req.imageSize,
                seed: req.seed,
            };
            const res = await fetch("/api/gemini/nano-banana", {
                method: "POST",
                body: JSON.stringify({ prompt: req.prompt, imageBase64List, options }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { dataUrl } = (await res.json()) as { dataUrl: string };
            showToast("Nano Banana: изображение готово!");
            return dataUrl;
        } catch (e) {
            console.warn("Nano Banana error:", e);
            showToast("Nano Banana: ошибка API");
            return null;
        }
    },

    async generateAudio(req, showToast) {
        if (!isProviderConfigured("gemini")) {
            showToast("Lyria: mock режим");
            return null;
        }
        try {
            showToast("Lyria: генерация музыки…");
            const options = { model: req.model, seed: req.seed };
            const res = await fetch("/api/gemini/lyria", {
                method: "POST",
                body: JSON.stringify({ prompt: req.prompt, options }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { dataUrl } = (await res.json()) as { dataUrl: string };
            showToast("Lyria: музыка готова!");
            return dataUrl;
        } catch (e) {
            console.warn("Lyria error:", e);
            showToast("Lyria: ошибка API");
            return null;
        }
    },
};
