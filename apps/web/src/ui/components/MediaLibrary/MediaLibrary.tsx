import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import type { MediaAsset } from "@hayverse/api-client";
import { hayverseApiClient } from "@/core/api/hayverse/client.ts";
import { useUserContext } from "@/store/contexts/UserContext.tsx";
import { CircleLoader } from "@/ui/components/CircleLoader/CircleLoader.tsx";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import styles from "@/ui/components/MediaLibrary/MediaLibrary.module.css";

const LIBRARY_TABS = [
    { key: "uploaded", label: "Загруженные" },
    { key: "generated", label: "Сгенерированные" },
] as const;
type MediaLibraryTab = (typeof LIBRARY_TABS)[number]["key"];

// Chrome-free grid+tabs backing MediaPickerButton below — fetches the full
// list once per mount and filters by tab client-side, since GET /media has
// no kind filter param. Selection always hands back asset.storageKey (the
// s3:<uuid> ref), matching what putBlob/putGeneratedBlob already resolve to
// and what every node param stores.
export function MediaLibraryGrid({
    onSelect,
}: {
    onSelect: (ref: string, asset: MediaAsset) => void;
}) {
    const [tab, setTab] = useState<MediaLibraryTab>("uploaded");
    const [assets, setAssets] = useState<MediaAsset[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        hayverseApiClient.media.list().then(
            (result) => {
                if (!cancelled) setAssets(result);
            },
            () => {
                if (!cancelled) setAssets([]);
            },
        );
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(() => assets?.filter((a) => a.kind === tab) ?? [], [assets, tab]);

    return (
        <>
            <div className={styles.tabRow}>
                {LIBRARY_TABS.map((t) => (
                    <button
                        key={t.key}
                        className={cn(styles.tabBtn, tab === t.key && styles.tabBtnActive)}
                        onClick={() => setTab(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>
            <div className={styles.sheetBody}>
                {assets === null ? (
                    <div className={styles.loading}>
                        <CircleLoader />
                    </div>
                ) : filtered.length === 0 ? (
                    <p className={styles.emptyHint}>
                        {tab === "uploaded"
                            ? "Нет загруженных файлов."
                            : "Нет сгенерированных файлов."}
                    </p>
                ) : (
                    <div className={styles.grid}>
                        {filtered.map((asset) => {
                            const isImage = asset.mimeType.startsWith("image/");
                            return (
                                <button
                                    type="button"
                                    key={asset.id}
                                    className={styles.card}
                                    onClick={() => onSelect(asset.storageKey, asset)}
                                    title={asset.mimeType}>
                                    <span
                                        className={styles.cardThumb}
                                        style={
                                            isImage
                                                ? { backgroundImage: `url(${asset.url})` }
                                                : undefined
                                        }>
                                        {!isImage && (
                                            <i
                                                className={cn(
                                                    "ti",
                                                    asset.mimeType.startsWith("video/")
                                                        ? "ti-video"
                                                        : "ti-file",
                                                )}
                                            />
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

export function MediaLibraryModalShell({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className={styles.modal} onClick={onClose}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                <div className={styles.sheetH}>
                    <h2>{title}</h2>
                    <button className={styles.x} onClick={onClose}>
                        <i className="ti ti-x" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

// Trigger button + portal-rendered library, single-pick-per-open: clicking a
// card calls onPick and closes immediately (matches PresetsField's
// trigger+portal shape). Callers needing multiple photos (PhotoPreview) just
// re-open the picker; there's no multi-checkbox grid mode.
export function MediaPickerButton({
    onPick,
    disabled,
    title = "Выбрать из медиатеки",
    trigger,
}: {
    onPick: (ref: string, asset: MediaAsset) => void;
    disabled?: boolean;
    title?: string;
    // Same render-prop shape as Popover's `trigger` — lets MediaSlider supply
    // its own overlay-styled button instead of the default IconButton, while
    // the logged-out guard and modal plumbing stay in one place.
    trigger?: (props: { open: () => void; disabled: boolean; title: string }) => React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const { currentUser } = useUserContext();
    const isDisabled = !!disabled || !currentUser;
    const resolvedTitle = !currentUser ? "Войдите, чтобы открыть медиатеку" : title;

    return (
        <>
            {trigger ? (
                trigger({ open: () => setOpen(true), disabled: isDisabled, title: resolvedTitle })
            ) : (
                <IconButton
                    icon="photo-plus"
                    onClick={() => setOpen(true)}
                    disabled={isDisabled}
                    title={resolvedTitle}
                />
            )}
            {open &&
                createPortal(
                    <MediaLibraryModalShell
                        title="Выбрать из медиатеки"
                        onClose={() => setOpen(false)}>
                        <MediaLibraryGrid
                            onSelect={(ref, asset) => {
                                onPick(ref, asset);
                                setOpen(false);
                            }}
                        />
                    </MediaLibraryModalShell>,
                    document.body,
                )}
        </>
    );
}
