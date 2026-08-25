import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import { useClickOutside } from "@/ui/hooks/useClickOutside.ts";
import { useEscapeKey } from "@/ui/hooks/useEscapeKey.ts";
import {
    usePopoverPosition,
    type PopoverAlign,
    type PopoverSide,
} from "@/ui/components/Popover/usePopoverPosition.ts";
import styles from "@/ui/components/Popover/Popover.module.css";

// Which edge of the panel the arrow attaches to for a given resolved side —
// e.g. side "bottom" means the panel sits below the trigger, so the arrow
// sits on the panel's top edge, pointing back up at the trigger.
const ARROW_EDGE_CLASS: Record<PopoverSide, string> = {
    bottom: styles.sideBottom,
    top: styles.sideTop,
    left: styles.sideLeft,
    right: styles.sideRight,
};

export function Popover({
    trigger,
    children,
    side = "bottom",
    align = "end",
    alignOffset = 0,
    gap = 4,
    arrow = false,
}: {
    trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
    children: (close: () => void) => ReactNode;
    side?: PopoverSide;
    align?: PopoverAlign;
    alignOffset?: number;
    gap?: number;
    arrow?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setOpen(false), []);
    const outsideRefs = useMemo(() => [triggerRef, panelRef], [triggerRef, panelRef]);
    useClickOutside(outsideRefs, close, open);
    useEscapeKey(close, open);

    const position = usePopoverPosition({
        open,
        triggerRef,
        panelRef,
        side,
        align,
        alignOffset,
        gap,
    });

    return (
        <>
            <div className={styles.wrap} ref={triggerRef}>
                {trigger({ open, toggle: () => setOpen((o) => !o) })}
            </div>
            {open &&
                createPortal(
                    <div
                        className={styles.panel}
                        ref={panelRef}
                        style={
                            position
                                ? { top: position.top, left: position.left, visibility: "visible" }
                                : { top: 0, left: 0, visibility: "hidden" }
                        }>
                        {arrow && position && (
                            <div
                                className={cn(styles.arrowWrap, ARROW_EDGE_CLASS[position.side])}
                                style={
                                    position.side === "bottom" || position.side === "top"
                                        ? { left: position.arrowOffset }
                                        : { top: position.arrowOffset }
                                }>
                                <div className={styles.arrow} />
                            </div>
                        )}
                        {children(close)}
                    </div>,
                    document.body,
                )}
        </>
    );
}
