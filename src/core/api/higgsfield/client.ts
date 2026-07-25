// Adapter over core/services/higgsfield.ts (untouched fetch/mock/poll logic).
// This is the seam a generated Swagger client swaps into later — call sites
// depend on this interface, not on HiggsfieldService directly.
import { HiggsfieldService } from "../../services/index.ts";
import type { RunSoulRequest, RunMotionRequest, RunSpeakRequest } from "./dto.ts";

type ShowToast = (msg: string) => void;

export interface HiggsfieldApiClient {
    runSoul(req: RunSoulRequest, showToast: ShowToast): Promise<string>;
    runMotion(req: RunMotionRequest, showToast: ShowToast): Promise<string | null>;
    runSpeak(req: RunSpeakRequest, showToast: ShowToast): Promise<string | null>;
}

export const higgsfieldApiClient: HiggsfieldApiClient = {
    runSoul: (req, showToast) => HiggsfieldService.runSoul(req.prompt, req.faceRefUrl, showToast),
    runMotion: (req, showToast) => HiggsfieldService.runMotion(req.frameUrl, req.preset, showToast),
    runSpeak: (req, showToast) =>
        HiggsfieldService.runSpeak(req.avatarUrl, req.speechText, showToast),
};
