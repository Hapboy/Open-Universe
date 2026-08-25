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
// as before). There's no separate "add new" flow — the Save button next to
// the trigger is a single upsert (see `onSave` in shared.tsx): if the node
// isn't linked to a saved preset yet, Save creates one from its current
// params; if it is, Save overwrites it. Gated by `missingSaveFields` so a
// preset can't be saved without the fields the entity type actually
// requires.
export function PresetsField({
    label,
    items,
    selected,
    onSelect,
    onSave,
    hasUnsavedChanges,
    missingSaveFields,
    isResolving = false,
}: {
    label: string;
    items: readonly PresetCardItem[];
    selected: string;
    onSelect: (v: string) => void;
    onSave: () => void;
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
    onClose,
}: {
    label: string;
    items: readonly PresetCardItem[];
    thumbs: (string | undefined)[];
    selected: string;
    onSelect: (v: string) => void;
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
                    {items.length === 0 ? (
                        <p className={styles.emptyHint}>
                            Пока нет сохранённых пресетов — заполните поля и нажмите «Сохранить».
                        </p>
                    ) : (
                        <div className={styles.grid}>
                            {items.map((item, i) => (
                                <button
                                    type="button"
                                    key={item.value}
                                    className={cn(
                                        styles.card,
                                        item.value === selected && styles.cardActive,
                                    )}
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
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
