import { useLayoutEffect, useState, type RefObject } from "react";

export type PopoverSide = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

interface UsePopoverPositionArgs {
    open: boolean;
    triggerRef: RefObject<HTMLElement | null>;
    panelRef: RefObject<HTMLElement | null>;
    side: PopoverSide;
    align: PopoverAlign;
    gap: number;
    // Extra nudge along the cross axis, added after `align` is applied — e.g.
    // a trigger that sits a few px inset from its own container's edge (like
    // a header button below the card's top border) can pass a small negative
    // offset to line the panel back up with that container instead.
    alignOffset?: number;
}

interface PopoverPositionResult {
    top: number;
    left: number;
    side: PopoverSide;
    // Cross-axis offset (from the panel's own top-left corner) where the
    // arrow should sit so it points at the trigger's center — not always the
    // panel's own center, since cross-axis clamping or a non-"center" align
    // can shift the panel away from the trigger. See Popover.tsx's `arrow`.
    arrowOffset: number;
}

const VIEWPORT_PADDING = 8;
// Keeps the arrow from sliding into the panel's rounded corners.
const ARROW_MARGIN = 12;

function crossAxisPosition(
    triggerStart: number,
    triggerSize: number,
    panelSize: number,
    align: PopoverAlign,
    alignOffset: number,
): number {
    if (align === "start") return triggerStart + alignOffset;
    if (align === "center") return triggerStart + triggerSize / 2 - panelSize / 2 + alignOffset;
    return triggerStart + triggerSize - panelSize + alignOffset;
}

function computeSidePosition(
    t: DOMRect,
    p: DOMRect,
    side: PopoverSide,
    align: PopoverAlign,
    gap: number,
    alignOffset: number,
): { top: number; left: number } {
    switch (side) {
        case "bottom":
            return {
                top: t.bottom + gap,
                left: crossAxisPosition(t.left, t.width, p.width, align, alignOffset),
            };
        case "top":
            return {
                top: t.top - p.height - gap,
                left: crossAxisPosition(t.left, t.width, p.width, align, alignOffset),
            };
        case "right":
            return {
                top: crossAxisPosition(t.top, t.height, p.height, align, alignOffset),
                left: t.right + gap,
            };
        case "left":
            return {
                top: crossAxisPosition(t.top, t.height, p.height, align, alignOffset),
                left: t.left - p.width - gap,
            };
    }
}

function mainAxisOverflow(
    pos: { top: number; left: number },
    p: DOMRect,
    side: PopoverSide,
): number {
    switch (side) {
        case "bottom":
            return pos.top + p.height - (window.innerHeight - VIEWPORT_PADDING);
        case "top":
            return VIEWPORT_PADDING - pos.top;
        case "right":
            return pos.left + p.width - (window.innerWidth - VIEWPORT_PADDING);
        case "left":
            return VIEWPORT_PADDING - pos.left;
    }
}

const OPPOSITE: Record<PopoverSide, PopoverSide> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
};

function clamp(value: number, min: number, max: number): number {
    return max < min ? min : Math.min(Math.max(value, min), max);
}

// Measures trigger + panel, picks the requested side (or its opposite if the
// requested one would overflow the viewport), and clamps the cross axis so
// the panel never hangs off a side edge either way.
export function usePopoverPosition({
    open,
    triggerRef,
    panelRef,
    side,
    align,
    gap,
    alignOffset = 0,
}: UsePopoverPositionArgs): PopoverPositionResult | null {
    const [result, setResult] = useState<PopoverPositionResult | null>(null);

    useLayoutEffect(() => {
        // Deliberately don't reset `result` to null here: the panel is only
        // ever mounted (and this value read) while `open`, so a stale value
        // from a previous open session sits unused until this same effect
        // recomputes it below, before the browser paints.
        if (!open) return;

        const reposition = () => {
            const trigger = triggerRef.current;
            const panel = panelRef.current;
            if (!trigger || !panel) return;
            const t = trigger.getBoundingClientRect();
            const p = panel.getBoundingClientRect();

            let resolvedSide = side;
            let pos = computeSidePosition(t, p, side, align, gap, alignOffset);
            const overflow = mainAxisOverflow(pos, p, side);
            if (overflow > 0) {
                const flippedSide = OPPOSITE[side];
                const flippedPos = computeSidePosition(t, p, flippedSide, align, gap, alignOffset);
                const flippedOverflow = mainAxisOverflow(flippedPos, p, flippedSide);
                if (flippedOverflow < overflow) {
                    resolvedSide = flippedSide;
                    pos = flippedPos;
                }
            }

            // Flipping a side always stays on the same axis (top<->bottom,
            // left<->right), so the cross axis to clamp only depends on the
            // originally requested side.
            let arrowOffset: number;
            if (side === "bottom" || side === "top") {
                pos.left = clamp(
                    pos.left,
                    VIEWPORT_PADDING,
                    window.innerWidth - p.width - VIEWPORT_PADDING,
                );
                arrowOffset = clamp(
                    t.left + t.width / 2 - pos.left,
                    ARROW_MARGIN,
                    p.width - ARROW_MARGIN,
                );
            } else {
                pos.top = clamp(
                    pos.top,
                    VIEWPORT_PADDING,
                    window.innerHeight - p.height - VIEWPORT_PADDING,
                );
                arrowOffset = clamp(
                    t.top + t.height / 2 - pos.top,
                    ARROW_MARGIN,
                    p.height - ARROW_MARGIN,
                );
            }

            setResult({ top: pos.top, left: pos.left, side: resolvedSide, arrowOffset });
        };

        reposition();

        window.addEventListener("scroll", reposition, { capture: true, passive: true });
        window.addEventListener("resize", reposition);
        const observer = new ResizeObserver(reposition);
        if (triggerRef.current) observer.observe(triggerRef.current);
        if (panelRef.current) observer.observe(panelRef.current);

        return () => {
            window.removeEventListener("scroll", reposition, { capture: true });
            window.removeEventListener("resize", reposition);
            observer.disconnect();
        };
    }, [open, triggerRef, panelRef, side, align, gap, alignOffset]);

    return result;
}
