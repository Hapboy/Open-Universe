import { useCallback } from "react";

// Shared by Timeline and MontageMonitor, which each toggle fullscreen on a
// different element (the app shell vs. the monitor window itself).
export function useFullscreenToggle(getElement: () => HTMLElement | null) {
    return useCallback(() => {
        const el = getElement();
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen().catch((err) => console.error(err));
        } else {
            document.exitFullscreen().catch((err) => console.error(err));
        }
    }, [getElement]);
}
