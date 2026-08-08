import { useEffect, useRef, useState, type ReactNode } from "react";
import cn from "classnames";
import styles from "@/ui/components/Popover/Popover.module.css";

export function Popover({
    trigger,
    children,
    align = "right",
}: {
    trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
    children: (close: () => void) => ReactNode;
    align?: "left" | "right";
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div className={styles.wrap} ref={ref}>
            {trigger({ open, toggle: () => setOpen((o) => !o) })}
            {open && (
                <div className={cn(styles.panel, align === "left" && styles.alignLeft)}>
                    {children(() => setOpen(false))}
                </div>
            )}
        </div>
    );
}
