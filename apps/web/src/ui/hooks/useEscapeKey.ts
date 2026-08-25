import { useEffect } from "react";

// Fires onEscape on an Escape keydown while active.
export function useEscapeKey(onEscape: () => void, active = true): void {
    useEffect(() => {
        if (!active) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onEscape();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [active, onEscape]);
}
