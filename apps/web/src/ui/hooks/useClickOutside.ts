import { useEffect, type RefObject } from "react";

// Fires onOutside on a mousedown OR wheel event whose target is outside every
// given ref — a click elsewhere, a React Flow canvas drag-pan (which starts
// with mousedown on the pane), and a mouse-wheel zoom on the canvas all count
// as "outside interaction" and dismiss the same way. Takes an array of refs
// (not a single one) because a portaled panel and its trigger are separate
// DOM subtrees — see Popover.tsx.
//
// Listens on the CAPTURE phase, not bubble: React Flow's pane handles both
// its drag-pan (mousedown) and its wheel-zoom itself and calls
// stopPropagation, which would otherwise silently stop this from ever seeing
// canvas interactions — capture runs before that, so it can't be swallowed by
// an ancestor's own handler.
export function useClickOutside(
    refs: RefObject<HTMLElement | null>[],
    onOutside: () => void,
    active = true,
): void {
    useEffect(() => {
        if (!active) return;
        const onOutsideInteraction = (e: Event) => {
            const target = e.target as Node;
            if (refs.some((ref) => ref.current?.contains(target))) return;
            onOutside();
        };
        document.addEventListener("mousedown", onOutsideInteraction, true);
        document.addEventListener("wheel", onOutsideInteraction, true);
        return () => {
            document.removeEventListener("mousedown", onOutsideInteraction, true);
            document.removeEventListener("wheel", onOutsideInteraction, true);
        };
    }, [active, refs, onOutside]);
}
