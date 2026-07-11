import { useRef } from "react";
import cn from "classnames";
import type { NodeRef } from "../../../types.ts";
import { putBlob, useResolvedMediaUrls } from "../../../core/blobStore.ts";
import { MediaSlider } from "../../NodeCard/MediaSlider/MediaSlider.tsx";
import { CircleLoader } from "../CircleLoader/CircleLoader.tsx";
import styles from "./PhotoGallerySection.module.css";

// MediaSlider + clickable thumbnail strip for picking the cover photo, split
// out so it can be positioned independently of the upload/Pinterest controls
// (e.g. pinned to the top of a node, above the search field).
export function PhotoPreview({
    node,
    photos,
    photoIdx,
    updateNodeParam,
    setNodePhotos,
}: {
    node: NodeRef;
    photos: string[];
    photoIdx: number;
    updateNodeParam: (id: string, key: string, value: unknown) => void;
    setNodePhotos: (id: string, photos: string[], photoIdx: number) => void;
}) {
    const resolvedThumbs = useResolvedMediaUrls(photos);
    if (photos.length === 0) return null;

    return (
        <>
            <MediaSlider
                items={resolvedThumbs.map((url) => ({ url, type: "image" }))}
                index={photoIdx}
                onIndexChange={(i) => updateNodeParam(node.id, "photoIdx", i)}
                onDelete={(i) => {
                    const next = photos.filter((_, idx) => idx !== i);
                    setNodePhotos(node.id, next, Math.max(0, Math.min(photoIdx, next.length - 1)));
                }}
            />
            <div className={styles.thumbnailsList}>
                {resolvedThumbs.map((url, idx) => (
                    <div
                        key={idx}
                        className={cn(styles.thumbCell, idx === photoIdx && styles.thumbCellActive)}
                        onClick={() => updateNodeParam(node.id, "photoIdx", idx)}
                        style={{ backgroundImage: url ? `url(${url})` : undefined }}
                        title="Установить как обложку"
                    />
                ))}
            </div>
        </>
    );
}

// Reusable "photo section" for entity nodes: an upload button + Pinterest
// board URL field. The slider/thumbnail preview lives separately in
// `PhotoPreview` above (typically pinned to the top of the node) — backed by
// the same entity's `photos`/`photoIdx`/`pinterestUrl` params and the shared
// `setNodePhotos` mutator (see GraphContext.tsx), which keeps per-photo
// output pins in sync with the array.
export function PhotoGallerySection({
    node,
    label,
    photos,
    pinterestUrl,
    updateNodeParam,
    setNodePhotos,
    maxPhotos = 10,
    resetKey,
    onGenerate,
    isGenerating,
}: {
    node: NodeRef;
    label: string;
    photos: string[];
    pinterestUrl: string;
    updateNodeParam: (id: string, key: string, value: unknown) => void;
    setNodePhotos: (id: string, photos: string[], photoIdx: number) => void;
    maxPhotos?: number;
    resetKey?: string;
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
                <input
                    key={resetKey}
                    type="text"
                    placeholder="Pinterest board URL"
                    defaultValue={pinterestUrl || ""}
                    onBlur={(e) => updateNodeParam(node.id, "pinterestUrl", e.target.value)}
                />
                <button
                    className={styles.iconBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= maxPhotos}
                    title="Загрузить фото">
                    <i className="ti ti-upload" />
                </button>
                {onGenerate && (
                    <button
                        className={styles.iconBtn}
                        onClick={onGenerate}
                        disabled={isGenerating || photos.length >= maxPhotos}
                        title="Сгенерировать фото">
                        {isGenerating ? <CircleLoader /> : <i className="ti ti-wand" />}
                    </button>
                )}
            </div>
        </div>
    );
}
