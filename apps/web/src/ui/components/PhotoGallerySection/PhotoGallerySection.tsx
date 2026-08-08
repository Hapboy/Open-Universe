import { useRef } from "react";
import cn from "classnames";
import type { NodeRef } from "../../../types.ts";
import { putBlob, useResolvedMediaUrls } from "../../../core/mediaRef.ts";
import { MediaSlider } from "../../NodeCard/MediaSlider/MediaSlider.tsx";
import { IconButton } from "../IconButton/IconButton.tsx";
import { MediaPickerButton } from "../MediaLibrary/MediaLibrary.tsx";
import styles from "./PhotoGallerySection.module.css";

// MediaSlider + clickable thumbnail strip for picking the cover photo, split
// out so it can be positioned independently of the upload controls (e.g.
// pinned to the top of a node, above the search field).
export function PhotoPreview({
    node,
    photos,
    coverPhotoIndex,
    updateNodeParam,
    setNodePhotos,
}: {
    node: NodeRef;
    photos: string[];
    coverPhotoIndex: number;
    updateNodeParam: (id: string, key: string, value: unknown) => void;
    setNodePhotos: (id: string, photos: string[], coverPhotoIndex: number) => void;
}) {
    const resolvedThumbs = useResolvedMediaUrls(photos);
    if (photos.length === 0) return null;

    return (
        <>
            <MediaSlider
                items={resolvedThumbs.map((url) => ({ url, type: "image" }))}
                index={coverPhotoIndex}
                onIndexChange={(i) => updateNodeParam(node.id, "coverPhotoIndex", i)}
                onDelete={(i) => {
                    const next = photos.filter((_, idx) => idx !== i);
                    setNodePhotos(
                        node.id,
                        next,
                        Math.max(0, Math.min(coverPhotoIndex, next.length - 1)),
                    );
                }}
            />
            <div className={styles.thumbnailsList}>
                {resolvedThumbs.map((url, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            styles.thumbCell,
                            idx === coverPhotoIndex && styles.thumbCellActive,
                        )}
                        onClick={() => updateNodeParam(node.id, "coverPhotoIndex", idx)}
                        style={{ backgroundImage: url ? `url(${url})` : undefined }}
                        title="Установить как обложку"
                    />
                ))}
            </div>
        </>
    );
}

// Reusable "photo section" for entity nodes: an upload button. The
// slider/thumbnail preview lives separately in `PhotoPreview` above
// (typically pinned to the top of the node) — backed by the same entity's
// `photos`/`coverPhotoIndex` params and the shared `setNodePhotos` mutator (see
// GraphContext.tsx), which keeps per-photo output pins in sync with the array.
export function PhotoGallerySection({
    node,
    label,
    photos,
    setNodePhotos,
    maxPhotos = 10,
    onGenerate,
    isGenerating,
}: {
    node: NodeRef;
    label: string;
    photos: string[];
    setNodePhotos: (id: string, photos: string[], coverPhotoIndex: number) => void;
    maxPhotos?: number;
    // Optional AI-generation entry point, opted into per entity type (see
    // CharacterParams) — rendered as an icon-only button next to Upload.
    onGenerate?: () => void;
    isGenerating?: boolean;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        Promise.all(files.map((file) => putBlob(file))).then((newPhotos) => {
            const next = [...photos, ...newPhotos];
            setNodePhotos(node.id, next, next.length - 1);
        }, console.error);
        e.target.value = "";
    };

    const handlePick = (ref: string) => {
        const next = [...photos, ref];
        setNodePhotos(node.id, next, next.length - 1);
    };

    return (
        <div className={styles.fld}>
            <span>
                {label} ({photos.length})
            </span>
            <div className={styles.photoActions}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleUpload}
                />
                <IconButton
                    icon="upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= maxPhotos}
                    title="Загрузить фото"
                />
                <MediaPickerButton
                    onPick={handlePick}
                    disabled={photos.length >= maxPhotos}
                    title="Выбрать из медиатеки"
                />
                {onGenerate && (
                    <IconButton
                        icon="wand"
                        onClick={onGenerate}
                        loading={isGenerating}
                        disabled={photos.length >= maxPhotos}
                        title="Сгенерировать фото"
                    />
                )}
            </div>
        </div>
    );
}
