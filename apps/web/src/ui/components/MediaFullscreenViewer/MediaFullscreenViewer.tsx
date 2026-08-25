import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import type { MediaItem } from "@/ui/NodeCard/MediaSlider/MediaSlider.tsx";
import styles from "@/ui/components/MediaFullscreenViewer/MediaFullscreenViewer.module.css";

// Portal-rendered lightbox opened from MediaSlider's expand button. Keeps its
// own index so it works standalone even when the slider is uncontrolled
// (no onIndexChange, e.g. NodeCard's output history); forwards onIndexChange
// too so controlled callers like PhotoPreview's cover picker stay in sync.
export function MediaFullscreenViewer({
    items,
    initialIndex,
    onClose,
    onIndexChange,
}: {
    items: MediaItem[];
    initialIndex: number;
    onClose: () => void;
    onIndexChange?: (i: number) => void;
}) {
    const [index, setIndex] = useState(initialIndex);
    const go = (i: number) => {
        const next = (i + items.length) % items.length;
        setIndex(next);
        onIndexChange?.(next);
    };

    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowLeft") go(index - 1);
            else if (e.key === "ArrowRight") go(index + 1);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index]);

    if (items.length === 0) return null;
    const item = items[Math.min(index, items.length - 1)];

    return createPortal(
        <div className={styles.backdrop} onClick={onClose}>
            <button className={styles.close} onClick={onClose} title="Закрыть">
                <i className="ti ti-x" />
            </button>
            <div className={styles.stage} onClick={(e) => e.stopPropagation()}>
                {items.length > 1 && (
                    <button className={cn(styles.nav, styles.prev)} onClick={() => go(index - 1)}>
                        <i className="ti ti-chevron-left" />
                    </button>
                )}
                {item.type === "video" ? (
                    <video src={item.url} className={styles.media} controls autoPlay muted />
                ) : (
                    <img src={item.url} alt="" className={styles.media} />
                )}
                {items.length > 1 && (
                    <button className={cn(styles.nav, styles.next)} onClick={() => go(index + 1)}>
                        <i className="ti ti-chevron-right" />
                    </button>
                )}
            </div>
            {items.length > 1 && (
                <span className={styles.count}>
                    {index + 1}/{items.length}
                </span>
            )}
            {items.length > 1 && (
                <div className={styles.thumbs} onClick={(e) => e.stopPropagation()}>
                    {items.map((t, i) => (
                        <button
                            key={i}
                            className={cn(styles.thumb, i === index && styles.thumbActive)}
                            style={t.url ? { backgroundImage: `url(${t.url})` } : undefined}
                            onClick={() => go(i)}
                        />
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
}
