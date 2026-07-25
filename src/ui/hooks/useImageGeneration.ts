import { useCallback, useState } from "react";
import { putGeneratedBlob } from "../../core/blobStore.ts";
import { useToastContext } from "../../store/contexts/ToastContext.tsx";

type ShowToast = (msg: string) => void;

// Wraps any single generation call (GeminiService.runNanoBanana, runImagen,
// ...) with local loading/error state and storage of the resulting data: URL
// as a generated blob ref — the same ref shape `photos` arrays already use.
// Takes a thunk rather than a fixed provider signature so one hook covers
// every provider's differing call shape instead of needing one hook per model.
export function useImageGeneration() {
    const { showToast } = useToastContext();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generate = useCallback(
        async (run: (showToast: ShowToast) => Promise<string | null>): Promise<string | null> => {
            setIsGenerating(true);
            setError(null);
            try {
                const dataUrl = await run(showToast);
                if (!dataUrl) return null;
                const blob = await (await fetch(dataUrl)).blob();
                return await putGeneratedBlob(blob);
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
                return null;
            } finally {
                setIsGenerating(false);
            }
        },
        [showToast],
    );

    return { generate, isGenerating, error };
}
