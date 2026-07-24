// Adapter over core/services/gemini.ts (untouched fetch/SDK/mock/poll
// logic). This is the seam a generated Swagger client swaps into later —
// call sites depend on this interface, not on GeminiService directly.
import { GeminiService } from "../../services/index.ts";
import type {
    ListModelsResponse,
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
    listModels: () => GeminiService.listModels(),

    generateText: (req, showToast) => GeminiService.runText(req.prompt, showToast, req.model),

    generateVision: (req, showToast) =>
        GeminiService.runVision(req.imageUrl, req.query, showToast, req.model),

    generateImage: (req, showToast) =>
        GeminiService.runImagen(
            req.prompt,
            {
                aspectRatio: req.aspectRatio,
                model: req.model,
                resolution: req.resolution,
                numberOfImages: req.numberOfImages,
                personGeneration: req.personGeneration,
                safetyFilterLevel: req.safetyFilterLevel,
                outputMimeType: req.outputMimeType,
                outputCompressionQuality: req.outputCompressionQuality,
                guidanceScale: req.guidanceScale,
            },
            showToast,
        ),

    generateVideo: (req, showToast) =>
        GeminiService.runVeo(
            req.prompt,
            req.imageUrl,
            {
                model: req.model,
                aspectRatio: req.aspectRatio,
                resolution: req.resolution,
                durationSeconds: req.durationSeconds,
                negativePrompt: req.negativePrompt,
                personGeneration: req.personGeneration,
                enhancePrompt: req.enhancePrompt,
            },
            showToast,
        ),

    generateImageFromRefs: (req, showToast) =>
        GeminiService.runNanoBanana(
            req.prompt,
            req.imageUrls,
            {
                model: req.model,
                aspectRatio: req.aspectRatio,
                imageSize: req.imageSize,
                seed: req.seed,
            },
            showToast,
        ),

    generateAudio: (req, showToast) =>
        GeminiService.runLyria(req.prompt, { model: req.model, seed: req.seed }, showToast),
};
