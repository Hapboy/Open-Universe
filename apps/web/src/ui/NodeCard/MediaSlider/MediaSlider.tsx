import { useRef, useState } from "react";
import cn from "classnames";
import { MediaFullscreenViewer } from "@/ui/components/MediaFullscreenViewer/MediaFullscreenViewer.tsx";
import { MediaPickerButton } from "@/ui/components/MediaLibrary/MediaLibrary.tsx";
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
    onAccept,
    acceptDisabled,
    acceptTitle,
    onPick,
    onUpload,
    addDisabled,
    emptyHint = "Нет медиа — нажмите, чтобы выбрать из медиатеки",
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
    // Promote the currently-shown item somewhere permanent — character's
    // «Принять в фото», which moves a generated variant into the entity gallery.
    onAccept?: () => void;
    acceptDisabled?: boolean;
    acceptTitle?: string;
    // Media-library pick and local upload. The caller does the putBlob for
    // uploads — multi-file semantics differ per call site. When `items` is
    // empty and at least one of these is set, the slider renders a clickable
    // placeholder instead of nothing; with neither it renders nothing at all,
    // which is what the standalone Gemini nodes' pure-output sliders want.
    onPick?: (ref: string) => void;
    onUpload?: (files: File[]) => void;
    addDisabled?: boolean;
    emptyHint?: string;
}) {
    const [ratios, setRatios] = useState<Record<string, number>>({});
    const [fullscreen, setFullscreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeIndex = Math.min(index, Math.max(items.length - 1, 0));
    const item = items[activeIndex] as MediaItem | undefined;
    const ratio = item?.url ? ratios[item.url] : undefined;

    const rememberRatio = (w: number, h: number) => {
        if (!item?.url || !w || !h) return;
        const r = w / h;
        if (ratios[item.url] === r) return;
        setRatios((prev) => ({ ...prev, [item.url as string]: r }));
    };

    const uploadInput = onUpload && (
        <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) onUpload(files);
                e.target.value = "";
            }}
        />
    );

    const uploadButton = onUpload && (
        <button
            className={styles.overlayBtn}
            disabled={addDisabled}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
            }}
            title="Загрузить файл">
            <i className="ti ti-upload" />
        </button>
    );

    const pickButton = onPick && (
        <MediaPickerButton
            onPick={(ref) => onPick(ref)}
            disabled={addDisabled}
            trigger={({ open, disabled, title }) => (
                <button
                    className={styles.overlayBtn}
                    disabled={disabled}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        open();
                    }}
                    title={title}>
                    <i className="ti ti-photo-plus" />
                </button>
            )}
        />
    );

    if (items.length === 0) {
        if (!onPick && !onUpload) return null;
        return (
            <div className={cn(styles.slider, styles.placeholder, "nodrag")}>
                {uploadInput}
                {onPick ? (
                    <MediaPickerButton
                        onPick={(ref) => onPick(ref)}
                        disabled={addDisabled}
                        trigger={({ open, disabled, title }) => (
                            <button
                                className={styles.placeholderBtn}
                                disabled={disabled}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    open();
                                }}
                                title={title}>
                                <i className="ti ti-photo-plus" />
                                <span>{emptyHint}</span>
                            </button>
                        )}
                    />
                ) : (
                    <button
                        className={styles.placeholderBtn}
                        disabled={addDisabled}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                        title="Загрузить файл">
                        <i className="ti ti-upload" />
                        <span>{emptyHint}</span>
                    </button>
                )}
                {onPick && onUpload && <div className={styles.overlayRow}>{uploadButton}</div>}
            </div>
        );
    }

    return (
        <div className={styles.slider} style={ratio ? { aspectRatio: String(ratio) } : undefined}>
            {uploadInput}
            {item?.type === "video" ? (
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
                    src={item?.url}
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
            <div className={styles.overlayRow}>
                {uploadButton}
                {pickButton}
                {onAccept && (
                    <button
                        className={styles.overlayBtn}
                        disabled={acceptDisabled}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAccept();
                        }}
                        title={acceptTitle ?? "Принять"}>
                        <i className="ti ti-check" />
                    </button>
                )}
                {onReroll && (
                    <button
                        className={styles.overlayBtn}
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
                        className={cn(styles.overlayBtn, styles.del)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(activeIndex);
                        }}
                        title="Удалить">
                        <i className="ti ti-trash" />
                    </button>
                )}
            </div>
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
