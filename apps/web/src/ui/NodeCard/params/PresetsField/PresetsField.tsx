import { useState } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import { useResolvedMediaUrls } from "@/core/mediaRef.ts";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import { BareButton } from "@/ui/components/BareButton/BareButton.tsx";
import type { PresetCardItem } from "@/ui/NodeCard/params/shared.tsx";
import styles from "@/ui/NodeCard/params/PresetsField/PresetsField.module.css";

// Replaces the old inline `<select>`-style dropdown: a trigger button opens
// a modal showing every saved preset for this entity type as a photo+name
// card. Clicking a card applies it (same params.presetId-driven `onSelect`
// as before). The Save button next to the trigger is a single upsert (see
// `onSave` in shared.tsx): if the node isn't linked to a saved preset yet,
// Save creates one from its current params; if it is, Save overwrites it.
// Gated by `missingSaveFields` so a preset can't be saved without the fields
// the entity type actually requires. Since Save is keyed by the node's own
// `presetId`, getting a *second* preset out of a node that already shows one
// goes through the modal's "Новый пресет" card instead (`onCreateNew`).
export function PresetsField({
    label,
    items,
    selected,
    onSelect,
    onSave,
    onCreateNew,
    onDelete,
    hasUnsavedChanges,
    missingSaveFields,
    isResolving = false,
}: {
    label: string;
    items: readonly PresetCardItem[];
    selected: string;
    onSelect: (v: string) => void;
    onSave: () => void;
    onCreateNew: () => void;
    onDelete: (v: string) => void;
    hasUnsavedChanges: boolean;
    missingSaveFields: readonly string[];
    // True while the saved `presetId` hasn't been checked against the loaded
    // preset library yet — shows a spinner instead of "Выбрать пресет...",
    // which right after reload would otherwise look like the selection was
    // lost even though it's just not confirmed yet.
    isResolving?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const thumbs = useResolvedMediaUrls(items.map((i) => i.photo ?? ""));
    const selectedIdx = items.findIndex((i) => i.value === selected);
    const selectedItem = selectedIdx !== -1 ? items[selectedIdx] : undefined;
    const canSave = missingSaveFields.length === 0;

    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <div className={styles.triggerRow}>
                <BareButton className={styles.trigger} onClick={() => setOpen(true)}>
                    {selectedItem ? (
                        <>
                            <span
                                className={styles.triggerThumb}
                                style={
                                    selectedIdx !== -1 && thumbs[selectedIdx]
                                        ? { backgroundImage: `url(${thumbs[selectedIdx]})` }
                                        : undefined
                                }
                            />
                            <span className={styles.triggerLabel}>{selectedItem.label}</span>
                        </>
                    ) : isResolving ? (
                        <>
                            <i className={cn("ti ti-loader-2", styles.triggerSpinner)} />
                            <span className={styles.triggerLabel}>Загрузка пресета...</span>
                        </>
                    ) : (
                        <span className={styles.triggerLabel}>Выбрать пресет...</span>
                    )}
                    <i className={cn("ti ti-chevron-right", styles.triggerChevron)} />
                </BareButton>
                <IconButton
                    icon="device-floppy"
                    variant={hasUnsavedChanges ? "primary" : "default"}
                    disabled={!hasUnsavedChanges || !canSave}
                    onClick={onSave}
                    title={
                        !canSave
                            ? `Нельзя сохранить: не заполнено — ${missingSaveFields.join(", ")}`
                            : hasUnsavedChanges
                              ? selectedItem
                                  ? "Сохранить изменения в пресет"
                                  : "Сохранить как новый пресет"
                              : "Нет изменений для сохранения"
                    }
                />
            </div>
            {open &&
                createPortal(
                    <PresetsModal
                        label={label}
                        items={items}
                        thumbs={thumbs}
                        selected={selected}
                        onSelect={(v) => {
                            onSelect(v);
                            setOpen(false);
                        }}
                        onCreateNew={() => {
                            onCreateNew();
                            setOpen(false);
                        }}
                        onDelete={onDelete}
                        onClose={() => setOpen(false)}
                    />,
                    document.body,
                )}
        </div>
    );
}

function PresetsModal({
    label,
    items,
    thumbs,
    selected,
    onSelect,
    onCreateNew,
    onDelete,
    onClose,
}: {
    label: string;
    items: readonly PresetCardItem[];
    thumbs: (string | undefined)[];
    selected: string;
    onSelect: (v: string) => void;
    onCreateNew: () => void;
    onDelete: (v: string) => void;
    onClose: () => void;
}) {
    return (
        <div className={styles.modal} onClick={onClose}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                <div className={styles.sheetH}>
                    <h2>{label}</h2>
                    <button className={styles.x} onClick={onClose}>
                        <i className="ti ti-x" />
                    </button>
                </div>
                <div className={styles.sheetBody}>
                    {/* The grid renders even with nothing saved yet, so the
                        empty-library hint sits under it rather than replacing
                        it. The "new preset" card leads the grid, but only for
                        a node actually linked to a saved preset (the same
                        condition the trigger's `selectedItem` is built from):
                        one that isn't already *is* an unsaved new preset, so
                        the card would say nothing there — and clicking it
                        would silently wipe whatever the user has filled in so
                        far. */}
                    <div className={styles.grid}>
                        {items.some((i) => i.value === selected) && (
                            <div className={cn(styles.card, styles.cardNew)}>
                                <button
                                    type="button"
                                    className={styles.cardSelect}
                                    onClick={onCreateNew}
                                    title="Очистить поля и начать новый пресет">
                                    <span className={styles.cardThumb}>
                                        <i className="ti ti-plus" />
                                    </span>
                                    <span className={styles.cardLabel}>Новый пресет</span>
                                </button>
                            </div>
                        )}
                        {items.map((item, i) => (
                            <div
                                key={item.value}
                                className={cn(
                                    styles.card,
                                    item.value === selected && styles.cardActive,
                                )}>
                                <button
                                    type="button"
                                    className={styles.cardDelete}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(item.value);
                                    }}
                                    title="Удалить пресет">
                                    <i className="ti ti-trash" />
                                </button>
                                <button
                                    type="button"
                                    className={styles.cardSelect}
                                    onClick={() => onSelect(item.value)}
                                    title={item.label}>
                                    <span
                                        className={styles.cardThumb}
                                        style={
                                            thumbs[i]
                                                ? { backgroundImage: `url(${thumbs[i]})` }
                                                : undefined
                                        }>
                                        {!thumbs[i] && <i className="ti ti-photo-off" />}
                                    </span>
                                    <span className={styles.cardLabel}>{item.label}</span>
                                    {item.value === selected && (
                                        <i className={cn("ti ti-check", styles.cardCheck)} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                    {items.length === 0 && (
                        <p className={styles.emptyHint}>
                            Пока нет сохранённых пресетов — заполните поля и нажмите «Сохранить».
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
