import { useState } from "react";
import cn from "classnames";
import { MediaFullscreenViewer } from "@/ui/components/MediaFullscreenViewer/MediaFullscreenViewer.tsx";
import styles from "@/ui/NodeCard/MediaSlider/MediaSlider.module.css";

export interface MediaItem {
    url: string | undefined;
    type?: "image" | "video";
}

export function MediaSlider({
    items,
    index = 0,
    onIndexChange,
    onDelete,
    onReroll,
}: {
    items: MediaItem[];
    index?: number;
    onIndexChange?: (i: number) => void;
    onDelete?: (i: number) => void;
    // Regenerate a close variant of the currently-shown item — seed+10000 for
    // Nano Banana/Lyria, a guidanceScale nudge for Imagen (see NodeCard.tsx's
    // handleReroll). Omitted entirely for node types that aren't reroll-capable
    // (Veo), same conditional-render shape as onDelete below.
    onReroll?: () => void;
}) {
    const [ratios, setRatios] = useState<Record<string, number>>({});
    const [fullscreen, setFullscreen] = useState(false);

    if (items.length === 0) return null;
    const activeIndex = Math.min(index, items.length - 1);
    const item = items[activeIndex];
    const ratio = item.url ? ratios[item.url] : undefined;

    const rememberRatio = (w: number, h: number) => {
        if (!item.url || !w || !h) return;
        const r = w / h;
        if (ratios[item.url] === r) return;
        setRatios((prev) => ({ ...prev, [item.url as string]: r }));
    };

    return (
        <div className={styles.slider} style={ratio ? { aspectRatio: String(ratio) } : undefined}>
            {item.type === "video" ? (
                <video
                    src={item.url}
                    className={cn(styles.media, "nodrag", "nowheel")}
                    controls
                    muted
                    onLoadedMetadata={(e) =>
                        rememberRatio(e.currentTarget.videoWidth, e.currentTarget.videoHeight)
                    }
                />
            ) : (
                <img
                    src={item.url}
                    alt=""
                    className={styles.media}
                    onLoad={(e) =>
                        rememberRatio(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
                    }
                />
            )}
            <button
                className={styles.expand}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    setFullscreen(true);
                }}
                title="На весь экран">
                <i className="ti ti-maximize" />
            </button>
            {items.length > 1 && onIndexChange && (
                <>
                    <button
                        className={cn(styles.nav, styles.prev)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onIndexChange((activeIndex - 1 + items.length) % items.length);
                        }}>
                        <i className="ti ti-chevron-left" />
                    </button>
                    <button
                        className={cn(styles.nav, styles.next)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onIndexChange((activeIndex + 1) % items.length);
                        }}>
                        <i className="ti ti-chevron-right" />
                    </button>
                    <span className={styles.count}>
                        {activeIndex + 1}/{items.length}
                    </span>
                </>
            )}
            {onReroll && (
                <button
                    className={styles.reroll}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onReroll();
                    }}
                    title="Немного изменить и перегенерировать">
                    <i className="ti ti-refresh" />
                </button>
            )}
            {onDelete && (
                <button
                    className={styles.del}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(activeIndex);
                    }}>
                    <i className="ti ti-trash" />
                </button>
            )}
            {fullscreen && (
                <MediaFullscreenViewer
                    items={items}
                    initialIndex={activeIndex}
                    onClose={() => setFullscreen(false)}
                    onIndexChange={onIndexChange}
                />
            )}
        </div>
    );
}
