import { useCallback, useState } from "react";
import { putGeneratedBlob } from "@/core/mediaRef.ts";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";

type ShowToast = (msg: string) => void;

// Wraps any generation call (GeminiService.runNanoBanana, runImagen, ...) with
// local loading/error state and storage of the resulting data: URLs as
// generated blob refs — the same ref shape `photos` entries already use.
// Takes a thunk rather than a fixed provider signature so one hook covers
// every provider's differing call shape instead of needing one hook per model.
//
// Plural because one call can answer with several images (Nano Banana returns
// every inlineData part — see apps/api's runNanoBanana); callers append them
// all to one generation history.
export function useImageGeneration() {
    const { showToast } = useToastContext();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generate = useCallback(
        async (run: (showToast: ShowToast) => Promise<string[] | null>): Promise<string[]> => {
            setIsGenerating(true);
            setError(null);
            try {
                const dataUrls = await run(showToast);
                if (!dataUrls?.length) return [];
                return await Promise.all(
                    dataUrls.map(async (dataUrl) =>
                        putGeneratedBlob(await (await fetch(dataUrl)).blob()),
                    ),
                );
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
                return [];
            } finally {
                setIsGenerating(false);
            }
        },
        [showToast],
    );

    return { generate, isGenerating, error };
}
