import { createContext, useCallback, useContext, useState } from "react";
import { ENTITY_PRESET_SEEDS } from "../../data/presets.ts";
import type { EntityPresets } from "../../types.ts";
import { useToastContext } from "./ToastContext.tsx";
import { readJSON } from "../../core/browserStorage.ts";
import { useDebouncedPersist } from "../hooks/usePersistedState.ts";

const LIBRARY_STORAGE_KEY = "hv_preset_library";

type PresetLibrary = Record<string, EntityPresets>;

// TODO(remove-legacy-preset-migration): one-time upgrade from the old
// name-keyed preset library (every entity type keyed by display name, with
// only `character` snapshots carrying a legacy `id` field) to the current
// presetId-keyed shape. Safe to delete this whole function — and its call in
// loadStoredLibrary — once active users' localStorage is assumed to have
// already gone through it at least once.
function migrateLibraryToPresetIds(stored: PresetLibrary): PresetLibrary {
    let changedAnywhere = false;
    const migrated: PresetLibrary = {};

    for (const [entityType, entries] of Object.entries(stored)) {
        let changed = false;
        const migratedEntries: EntityPresets = {};
        const seedEntries = ENTITY_PRESET_SEEDS[entityType] ?? {};

        for (const [key, snapshot] of Object.entries(entries)) {
            let id: string;
            let cleaned: Record<string, unknown>;

            if (typeof snapshot.presetId === "string" && snapshot.presetId) {
                id = snapshot.presetId;
                cleaned = snapshot;
                if (key !== id) changed = true;
            } else if (typeof snapshot.id === "string" && snapshot.id) {
                // legacy character-only identity field, predating presetId
                id = snapshot.id;
                cleaned = { ...snapshot, presetId: id };
                delete cleaned.id;
                changed = true;
            } else {
                const name = (snapshot.name as string | undefined) ?? key;
                const seedMatch = Object.entries(seedEntries).find(
                    ([, seedSnap]) => seedSnap.name === name,
                );
                id = seedMatch ? seedMatch[0] : crypto.randomUUID();
                cleaned = { ...snapshot, presetId: id, name };
                changed = true;
            }

            migratedEntries[id] = cleaned;
        }

        migrated[entityType] = changed ? migratedEntries : entries;
        if (changed) changedAnywhere = true;
    }

    return changedAnywhere ? migrated : stored;
}

function loadStoredLibrary(): PresetLibrary {
    const stored = readJSON<PresetLibrary>(LIBRARY_STORAGE_KEY, {});
    const migratedStored = migrateLibraryToPresetIds(stored);
    const seeds = JSON.parse(JSON.stringify(ENTITY_PRESET_SEEDS)) as PresetLibrary;
    const merged: PresetLibrary = {};
    for (const entityType of new Set([...Object.keys(seeds), ...Object.keys(migratedStored)])) {
        merged[entityType] = {
            ...(seeds[entityType] ?? {}),
            ...(migratedStored[entityType] ?? {}),
        };
    }
    return merged;
}

interface PresetLibraryCtx {
    library: PresetLibrary;
    addPreset: (entityType: string, presetId: string, snapshot: Record<string, unknown>) => void;
}

const Ctx = createContext<PresetLibraryCtx>(null!);
export const usePresetLibraryContext = () => useContext(Ctx);

export function PresetLibraryProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToastContext();
    const [library, setLibrary] = useState<PresetLibrary>(() => loadStoredLibrary());

    useDebouncedPersist(LIBRARY_STORAGE_KEY, () => library, [library], {
        onError: () =>
            showToast("Не удалось сохранить пресеты локально (превышен лимит хранилища)"),
    });

    const addPreset = useCallback(
        (entityType: string, presetId: string, snapshot: Record<string, unknown>) => {
            setLibrary((lib) => ({
                ...lib,
                [entityType]: { ...(lib[entityType] ?? {}), [presetId]: snapshot },
            }));
        },
        [],
    );

    const ctx: PresetLibraryCtx = { library, addPreset };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
