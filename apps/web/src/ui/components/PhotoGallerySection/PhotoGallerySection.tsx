import { useRef } from "react";
import cn from "classnames";
import { PHOTO_ROLES, PHOTO_ROLE_LABELS } from "@hayverse/shared";
import type { NodeRef } from "@/types.ts";
import type { EntityPhoto } from "@/schemas/entities/schemaHelpers.ts";
import { includedPhotos, MAX_ENTITY_PHOTOS } from "@/schemas/entities/schemaHelpers.ts";
import { putBlob, useResolvedMediaUrls } from "@/core/mediaRef.ts";
import { MediaSlider } from "@/ui/NodeCard/MediaSlider/MediaSlider.tsx";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import { MediaPickerButton } from "@/ui/components/MediaLibrary/MediaLibrary.tsx";
import { TextField } from "@/ui/components/TextField/TextField.tsx";
import { SelectField } from "@/ui/components/SelectField/SelectField.tsx";
import styles from "@/ui/components/PhotoGallerySection/PhotoGallerySection.module.css";

// Leading blank is explicit so a role can be cleared again — Select only
// injects one while nothing matches (see Select.tsx).
const ROLE_OPTIONS = [
    { value: "", label: "—" },
    ...PHOTO_ROLES.map((role) => ({ value: role, label: PHOTO_ROLE_LABELS[role] })),
];

// A fresh gallery entry: included by default, undescribed. Every "add a photo"
// path (upload, media library, accepting a generated variant) goes through
// this so the shape stays in one place.
export function newPhotoEntry(ref: string): EntityPhoto {
    return { ref, include: true };
}

// MediaSlider + clickable thumbnail strip for picking the cover photo, split
// out so it can be positioned independently of the upload controls (e.g.
// pinned to the top of a node, above the search field). Also where each photo
// is described (caption/role) and included/excluded — those travel with the
// photo into the entity's JSON output pin and any prompt composed from it, so
// they belong next to the picture rather than in a separate panel.
export function PhotoPreview({
    node,
    photos,
    coverPhotoIndex,
    updateNodeParam,
    setNodePhotos,
}: {
    node: NodeRef;
    photos: EntityPhoto[];
    coverPhotoIndex: number;
    updateNodeParam: (id: string, key: string, value: unknown) => void;
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const resolvedThumbs = useResolvedMediaUrls(photos.map((p) => p.ref));
    if (photos.length === 0) return null;

    const activeIndex = Math.max(0, Math.min(coverPhotoIndex, photos.length - 1));
    const active = photos[activeIndex];

    const patchPhoto = (idx: number, patch: Partial<EntityPhoto>) =>
        setNodePhotos(
            node.id,
            photos.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
            coverPhotoIndex,
        );

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
                        key={photos[idx].ref}
                        className={cn(
                            "nodrag",
                            styles.thumbCell,
                            idx === coverPhotoIndex && styles.thumbCellActive,
                            !photos[idx].include && styles.thumbCellExcluded,
                        )}
                        onClick={() => updateNodeParam(node.id, "coverPhotoIndex", idx)}
                        style={{ backgroundImage: url ? `url(${url})` : undefined }}
                        title="Установить как обложку">
                        <button
                            className={styles.thumbToggle}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                // Without this the click also sets the cover.
                                e.stopPropagation();
                                patchPhoto(idx, { include: !photos[idx].include });
                            }}
                            title={
                                photos[idx].include
                                    ? "Исключить из промптов и референсов"
                                    : "Вернуть в промпты и референсы"
                            }>
                            <i className={`ti ${photos[idx].include ? "ti-eye" : "ti-eye-off"}`} />
                        </button>
                    </div>
                ))}
            </div>
            {/* Deferred commit (defaultValue + onBlur): every setNodePhotos
                call records an undo entry and re-prunes photo-pin edges, which
                is far too much per keystroke. `key` remounts the input when the
                slider moves to another photo, since defaultValue alone wouldn't
                pick up the new caption. */}
            <TextField
                key={active.ref}
                label="Что на фото"
                placeholder="напр. лицо крупным планом, мягкий свет"
                defaultValue={active.caption ?? ""}
                onBlur={(v) => {
                    if (v !== (active.caption ?? "")) patchPhoto(activeIndex, { caption: v });
                }}
            />
            <SelectField
                label="Роль фото"
                value={active.role ?? ""}
                onChange={(v) => patchPhoto(activeIndex, { role: v as EntityPhoto["role"] })}
                options={ROLE_OPTIONS}
            />
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
    maxPhotos = MAX_ENTITY_PHOTOS,
}: {
    node: NodeRef;
    label: string;
    photos: EntityPhoto[];
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
    maxPhotos?: number;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const included = includedPhotos(photos).length;

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        Promise.all(files.map((file) => putBlob(file))).then((refs) => {
            const next = [...photos, ...refs.map(newPhotoEntry)];
            setNodePhotos(node.id, next, next.length - 1);
        }, console.error);
        e.target.value = "";
    };

    const handlePick = (ref: string) => {
        const next = [...photos, newPhotoEntry(ref)];
        setNodePhotos(node.id, next, next.length - 1);
    };

    return (
        <div className={styles.fld}>
            <span>
                {label} (
                {included === photos.length ? photos.length : `${included}/${photos.length}`})
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
            </div>
        </div>
    );
}
