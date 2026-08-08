import { useEffect } from "react";
import type { Edge } from "@xyflow/react";
import type { NodeRef, TimelineScene } from "@/types.ts";
import { usePresetLibraryContext } from "@/store/contexts/PresetLibraryContext.tsx";
import { Switch } from "@/ui/components/Switch/Switch.tsx";
import { ENTITY_PARAM_SCHEMAS } from "@/schemas/entities/schemas.ts";
import styles from "@/styles/shared.module.css";

export interface NodeParamsProps {
    node: NodeRef;
    edges: Edge[];
    resolved: Record<string, unknown>;
    scenes: TimelineScene[];
    updateNodeParam: (id: string, key: string, value: unknown) => void;
    updateNodeParams: (id: string, patch: Record<string, unknown>) => void;
    setNodePhotos: (id: string, photos: string[], coverPhotoIndex: number) => void;
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
//
// The unwired branch defaults to the same defaultValue/onBlur pattern every
// other param field used to use — pass `value`/`onChange` (e.g. from an RHF
// `Controller`) to make it fully controlled instead, so it can't go stale
// after an out-of-band store update (see useNodeParamsForm.ts).
export function WirableTextField({
    label,
    node,
    paramKey,
    params,
    wired,
    liveValue,
    updateNodeParam,
    value,
    onChange,
}: {
    label: string;
    node: NodeRef;
    paramKey: string;
    params: Record<string, unknown>;
    wired: boolean;
    liveValue: unknown;
    updateNodeParam: NodeParamsProps["updateNodeParam"];
    value?: string;
    onChange?: (value: string) => void;
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
                    : value !== undefined
                      ? { value, onChange: (e) => onChange?.(e.target.value) }
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

// `selectedItem` records which preset a node currently has selected — saving
// that into the preset's own snapshot would be circular, so it's always
// excluded. (`_presets`/`photoIdx` used to be stripped here too, for rows
// saved before presets became a shared library / before FixPresetPhotoIdxKey
// — both cleaned up by a one-time DB migration 2026-08-08, see
// MoveGenerationBookkeepingToSiblingField/StripLegacyPresetKeys.)
const BOOKKEEPING_KEYS = ["selectedItem"];

function buildPresetSnapshot(params: Record<string, unknown>) {
    return Object.fromEntries(
        Object.entries(params).filter(([k]) => !BOOKKEEPING_KEYS.includes(k)),
    );
}

// Manages an entity type's shared preset library (global, one per entity
// type — see PresetLibraryContext.tsx): its keys are each preset's stable
// `presetId`, its values are each entity's own saved params. Selecting an id
// loads its preset (if any) onto the node.
//
// Saving (`onSave`, wired to a small button next to the trigger) is a single
// upsert keyed by the node's own `presetId` — it's never linked yet (no
// library entry under that id) the first save creates one; saving again just
// overwrites it. It's explicit, not automatic: editing a node's params never
// silently rewrites the shared preset by itself — e.g. tweaking a character's
// age on one scene's node shouldn't quietly change what every other scene
// using that same preset sees the next time it's selected there. The user
// has to choose to push the save. `hasUnsavedChanges` reflects whether
// there's anything save-worthy — either the node isn't linked to a saved
// preset yet, or it is but has drifted from the stored snapshot — for that
// button's enabled state. As before, saving is write-only — it does not push
// to other nodes that already have this preset selected; they only pick up
// the change if the user re-selects it there. Live cross-node sync is out of
// scope until there's a real backend/multi-user story.

// A preset library entry as shown in a card in `PresetsModal`: an id/label
// pair (like `SelectOption`'s object form) plus the cover photo ref (if any)
// to resolve into a thumbnail.
export type PresetCardItem = { value: string; label: string; photo?: string };

// Short noun labels for the "Нельзя сохранить: не заполнено — ..." join list
// in PresetsField.tsx — kept separate from each field's own inline zod
// message (e.g. "Укажите имя"), which reads fine next to the field itself
// but would be redundant/verbose joined into one sentence here.
const SAVE_FIELD_LABELS: Record<string, string> = {
    name: "имя",
    photos: "фото",
    age: "возраст",
};

// Fields required before a node's current params may be saved as a preset
// (new or overwrite) — now read straight off the entity type's own zod
// schema (see EntityParams/schemas.ts) instead of a hand-rolled check, so
// "well-formed" and "saveable as a preset" are the same rule (name/photos/
// age are `.min()`-required there for exactly this reason).
function missingSaveFields(entityType: string, params: Record<string, unknown>): string[] {
    const schema = ENTITY_PARAM_SCHEMAS[entityType as keyof typeof ENTITY_PARAM_SCHEMAS];
    if (!schema) return [];
    const result = schema.safeParse(params);
    if (result.success) return [];
    const keys = new Set(result.error.issues.map((issue) => String(issue.path[0])));
    return [...keys].map((key) => SAVE_FIELD_LABELS[key] ?? key);
}

export function usePresetDatabase(
    node: NodeRef,
    params: Record<string, unknown>,
    updateNodeParams: NodeParamsProps["updateNodeParams"],
) {
    const { library, addPreset } = usePresetLibraryContext();
    const entityType = node.data.nodeType;
    const rawPresets = library[entityType];
    const presets = rawPresets ?? {};
    const db: PresetCardItem[] = Object.entries(presets).map(([id, snap]) => {
        const photos = snap.photos as string[] | undefined;
        const coverPhotoIndex = (snap.coverPhotoIndex as number | undefined) ?? 0;
        return {
            value: id,
            label: (snap.name as string) || id,
            photo: photos?.[coverPhotoIndex],
        };
    });
    const currentPresetId = params.presetId as string | undefined;
    const storedSnapshot = currentPresetId ? presets[currentPresetId] : undefined;
    const snapshot = buildPresetSnapshot(params);
    const missingSaveFieldsList = missingSaveFields(entityType, snapshot);
    const hasUnsavedChanges =
        !storedSnapshot || JSON.stringify(snapshot) !== JSON.stringify(storedSnapshot);

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

    const onSave = () => {
        if (!currentPresetId || missingSaveFieldsList.length > 0) return;
        addPreset(entityType, currentPresetId, snapshot);
        updateNodeParams(node.id, { selectedItem: snapshot.name as string });
    };

    return { db, onSelect, onSave, hasUnsavedChanges, missingSaveFields: missingSaveFieldsList };
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
