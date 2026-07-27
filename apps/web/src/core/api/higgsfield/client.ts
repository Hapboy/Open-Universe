// Adapter over app/api/higgsfield/*/route.ts (the real key lives server-only
// there now — see core/services/higgsfield.ts). This is the seam a generated
// Swagger client swaps into later — call sites depend on this interface, not on
// the route shape directly. Mock/fallback behavior below is ported verbatim from
// the pre-Phase-3 client-side HiggsfieldService: same toasts, same fallback
// values, just gated on isProviderConfigured() instead of a client-visible key
// check, and still used as the fallback on a failed fetch, not just when
// unconfigured. runSpeak is untouched — it was already 100% mock, no key, no route.
import { DEFAULT_PINS } from "../../../data/presets.ts";
import type { RunSoulRequest, RunMotionRequest, RunSpeakRequest } from "./dto.ts";
import { isProviderConfigured } from "../env.ts";

type ShowToast = (msg: string) => void;

export interface HiggsfieldApiClient {
    runSoul(req: RunSoulRequest, showToast: ShowToast): Promise<string>;
    runMotion(req: RunMotionRequest, showToast: ShowToast): Promise<string | null>;
    runSpeak(req: RunSpeakRequest, showToast: ShowToast): Promise<string | null>;
}

export const higgsfieldApiClient: HiggsfieldApiClient = {
    async runSoul({ prompt, faceRefUrl }, showToast) {
        if (!isProviderConfigured("higgsfield")) {
            showToast("Higgsfield Soul: Кадр сгенерирован (симуляция)");
            return faceRefUrl || DEFAULT_PINS[1].image;
        }
        try {
            showToast("Higgsfield Soul: Запуск генерации...");
            const res = await fetch("/api/higgsfield/soul", {
                method: "POST",
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { imageUrl } = (await res.json()) as { imageUrl: string };
            showToast("Higgsfield Soul: Кадр готов!");
            return imageUrl;
        } catch (e) {
            console.warn("Higgsfield Soul error:", e);
            showToast("Higgsfield Soul: Ошибка API, симуляция.");
            return faceRefUrl || DEFAULT_PINS[1].image;
        }
    },

    async runMotion({ frameUrl, preset }, showToast) {
        if (!isProviderConfigured("higgsfield") || !frameUrl) {
            showToast(`Higgsfield Motion: Пресет «${preset}» применен (симуляция)`);
            return frameUrl;
        }
        try {
            showToast("Higgsfield Motion: Запуск DoP видеогенерации...");
            const res = await fetch("/api/higgsfield/motion", {
                method: "POST",
                body: JSON.stringify({ frameUrl, preset }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { videoUrl } = (await res.json()) as { videoUrl: string };
            showToast("Higgsfield Motion: Видео готово!");
            return videoUrl;
        } catch (e) {
            console.warn("Higgsfield Motion error:", e);
            showToast("Higgsfield Motion: Ошибка API, симуляция.");
            return frameUrl;
        }
    },

    async runSpeak({ avatarUrl, speechText }, showToast) {
        showToast(`Higgsfield Speak: Липсинк «${speechText.substring(0, 20)}...» (симуляция)`);
        return avatarUrl;
    },
};
