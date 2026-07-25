import { useEffect, useState } from "react";
import cn from "classnames";
import type { Edge } from "@xyflow/react";
import type { NodeRef, TimelineScene } from "../../../types.ts";
import { usePresetLibraryContext } from "../../../store/contexts/PresetLibraryContext.tsx";
import { Switch } from "../../components/Switch/Switch.tsx";
import { Select, type SelectOption } from "../../components/Select/Select.tsx";
import styles from "../../../styles/shared.module.css";

export interface NodeParamsProps {
    node: NodeRef;
    edges: Edge[];
    resolved: Record<string, unknown>;
    scenes: TimelineScene[];
    updateNodeParam: (id: string, key: string, value: unknown) => void;
    updateNodeParams: (id: string, patch: Record<string, unknown>) => void;
    setNodePhotos: (id: string, photos: string[], photoIdx: number) => void;
    addImageInput: (id: string) => void;
    addTextInput: (id: string) => void;
    loadPinterestBoards: (node: NodeRef) => Promise<void>;
    loadPinterestPins: (node: NodeRef, boardId: string) => Promise<void>;
    executeGraph: () => Promise<void>;
}

export type EP<P extends Record<string, unknown>> = {
    node: NodeRef;
    params: P;
    updateNodeParam: NodeParamsProps["updateNodeParam"];
    updateNodeParams: NodeParamsProps["updateNodeParams"];
};

export type EEP = {
    node: NodeRef;
    params: Record<string, unknown>;
    edges: Edge[];
    resolved: Record<string, unknown>;
    updateNodeParam: NodeParamsProps["updateNodeParam"];
    executeGraph: NodeParamsProps["executeGraph"];
};

// Renders a "Промпт"-style field that shows a plain editable input when its
// source input pin is unwired, or a disabled input mirroring the live
// resolved value from the connected node when it's wired.
export function WirableTextField({
    label,
    node,
    paramKey,
    params,
    wired,
    liveValue,
    updateNodeParam,
}: {
    label: string;
    node: NodeRef;
    paramKey: string;
    params: Record<string, unknown>;
    wired: boolean;
    liveValue: unknown;
    updateNodeParam: NodeParamsProps["updateNodeParam"];
}) {
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <input
                key={wired ? "wired" : "editable"}
                type="text"
                disabled={wired}
                {...(wired
                    ? { value: (liveValue as string) ?? "" }
                    : { defaultValue: params[paramKey] as string })}
                onBlur={(e) => {
                    if (!wired) updateNodeParam(node.id, paramKey, e.target.value);
                }}
            />
            {wired && (
                <p className={styles.hint}>
                    Подключено к входному пину — значение задаётся источником
                </p>
            )}
        </div>
    );
}

// `_presets` is bookkept here for backward compatibility: nodes loaded from
// a graph saved before presets became a shared library (see
// PresetLibraryContext.tsx) may still carry a stray `_presets` key in their
// in-memory params, and it must never be snapshotted into a new preset.
const BOOKKEEPING_KEYS = ["selectedItem", "_presets"];

function buildPresetSnapshot(params: Record<string, unknown>) {
    return Object.fromEntries(
        Object.entries(params).filter(([k]) => !BOOKKEEPING_KEYS.includes(k)),
    );
}

// Manages an entity type's shared preset library (global, one per entity
// type — see PresetLibraryContext.tsx): its keys are each preset's stable
// `presetId`, its values are each entity's own saved params. Selecting an id
// loads its preset (if any) onto the node; adding a preset always mints a
// fresh id and snapshots the node's current params (everything but the
// bookkeeping keys above) under it — two presets may share a display name,
// since the name is no longer the identity.
//
// Updating an existing preset is explicit (`onUpdate`, wired to a small
// button next to the dropdown), not automatic: editing a node's params never
// silently rewrites the shared preset by itself — e.g. tweaking a character's
// age on one scene's node shouldn't quietly change what every other scene
// using that same preset sees the next time it's selected there. The user
// has to choose to push the update. `hasUnsavedChanges` reflects whether the
// node's current params have drifted from the stored preset, for that
// button's enabled state. As before, updating a preset is write-only — it
// does not push to other nodes that already have it selected; they only pick
// up the change if the user re-selects that preset on them. Live cross-node
// sync is out of scope until there's a real backend/multi-user story.
export function usePresetDatabase(
    node: NodeRef,
    params: Record<string, unknown>,
    updateNodeParams: NodeParamsProps["updateNodeParams"],
) {
    const { library, addPreset } = usePresetLibraryContext();
    const entityType = node.data.nodeType;
    const rawPresets = library[entityType];
    const presets = rawPresets ?? {};
    const db: SelectOption[] = Object.entries(presets).map(([id, snap]) => ({
        value: id,
        label: (snap.name as string) || id,
    }));
    const currentPresetId = params.presetId as string | undefined;
    const storedSnapshot = currentPresetId ? presets[currentPresetId] : undefined;
    const snapshot = buildPresetSnapshot(params);
    const hasUnsavedChanges =
        !!currentPresetId &&
        !!storedSnapshot &&
        JSON.stringify(snapshot) !== JSON.stringify(storedSnapshot);

    // Every entity node needs a stable `presetId`, whether it arrived via a
    // legacy graph (name only, no id yet) or was just spawned from a
    // NODE_TEMPLATES default (blank everything). Prefer a cataloged preset's
    // own id when the node's current name happens to match one, so two nodes
    // that "look like" the same preset don't end up as separate identities;
    // otherwise mint a fresh one. Guarded on `params.presetId` already being
    // set so this never re-fires once assigned.
    useEffect(() => {
        if (params.presetId) return;
        const selectedName = params.selectedItem as string | undefined;
        const matched = selectedName
            ? Object.entries(rawPresets ?? {}).find(([, s]) => s.name === selectedName)
            : undefined;
        updateNodeParams(node.id, { presetId: matched ? matched[0] : crypto.randomUUID() });
    }, [node.id, params.presetId, params.selectedItem, rawPresets, updateNodeParams]);

    const onSelect = (id: string) => {
        const preset = id ? presets[id] : undefined;
        const name = (preset?.name as string) ?? "";
        updateNodeParams(node.id, { presetId: id, selectedItem: name, name, ...(preset ?? {}) });
    };

    const onAdd = (name: string) => {
        const newId = crypto.randomUUID();
        // Default the node's own name field to what the user typed unless a
        // custom one is already set.
        const finalName = (snapshot.name as string) || name;
        const snap = { ...snapshot, presetId: newId, name: finalName };
        addPreset(entityType, newId, snap);
        updateNodeParams(node.id, { presetId: newId, selectedItem: finalName, name: finalName });
    };

    const onUpdate = () => {
        if (!currentPresetId) return;
        addPreset(entityType, currentPresetId, snapshot);
    };

    return { db, onSelect, onAdd, onUpdate, hasUnsavedChanges };
}

// Dropdown over a preset id list (labeled by name) with an inline "add new
// item" flow: pick from the select, or press the add button, type a name and
// confirm with Enter / the check button (Escape cancels).
export function DatabaseSelect({
    label,
    items,
    selected,
    onSelect,
    onAdd,
    onUpdate,
    hasUnsavedChanges,
    addLabel = "Добавить",
}: {
    label: string;
    items: readonly SelectOption[];
    selected: string;
    onSelect: (v: string) => void;
    onAdd: (name: string) => void;
    onUpdate?: () => void;
    hasUnsavedChanges?: boolean;
    addLabel?: string;
}) {
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState("");

    const cancel = () => {
        setAdding(false);
        setDraft("");
    };
    const confirm = () => {
        const name = draft.trim();
        if (!name) return cancel();
        onAdd(name);
        cancel();
    };

    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <div className={styles.presetRow}>
                <Select
                    className={styles.presetSelect}
                    value={selected}
                    onChange={onSelect}
                    options={items}
                />
                {onUpdate && selected && (
                    <button
                        className={cn(styles.iconBtn, hasUnsavedChanges && styles.pri)}
                        disabled={!hasUnsavedChanges}
                        onClick={onUpdate}
                        title={
                            hasUnsavedChanges
                                ? "Сохранить текущие значения в пресет"
                                : "Нет изменений для сохранения в пресет"
                        }>
                        <i className="ti ti-device-floppy" />
                    </button>
                )}
                {!adding && (
                    <button
                        className={styles.iconBtn}
                        onClick={() => setAdding(true)}
                        title={addLabel}>
                        <i className="ti ti-plus" />
                    </button>
                )}
            </div>
            {adding && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                        type="text"
                        autoFocus
                        placeholder="Имя нового..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") confirm();
                            if (e.key === "Escape") cancel();
                        }}
                    />
                    <button
                        className={cn(styles.btn, styles.pri)}
                        style={{ width: "auto", flexShrink: 0 }}
                        onClick={confirm}
                        aria-label="Подтвердить">
                        <i className="ti ti-check" />
                    </button>
                    <button
                        className={styles.btn}
                        style={{ width: "auto", flexShrink: 0 }}
                        onClick={cancel}
                        aria-label="Отмена">
                        <i className="ti ti-x" />
                    </button>
                </div>
            )}
        </div>
    );
}

export function InFrameToggle({
    value,
    onChange,
}: {
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return <Switch label="в кадре" value={value} onChange={onChange} />;
}
