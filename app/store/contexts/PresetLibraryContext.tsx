import { createContext, useCallback, useContext, useState } from "react";
import { ENTITY_PRESET_SEEDS } from "../../data/presets.ts";
import type { EntityPresets } from "../../types.ts";
import { useToastContext } from "./ToastContext.tsx";
import { readJSON } from "../../core/browserStorage.ts";
import { useDebouncedPersist } from "../hooks/usePersistedState.ts";

const LIBRARY_STORAGE_KEY = "hv_preset_library";

type PresetLibrary = Record<string, EntityPresets>;

// One-time backfill: character presets predating the `id` param (seeded
// defaults and anything a user already saved) need a stable id so the
// Timeline synapses view can match the same character across scenes by more
// than just their free-text name. Scoped to `character` only — other entity
// types don't need cross-scene identity yet.
function migrateCharacterIds(library: PresetLibrary): PresetLibrary {
    const characters = library.character;
    if (!characters) return library;
    let changed = false;
    const migrated: EntityPresets = {};
    for (const [name, snapshot] of Object.entries(characters)) {
        if (snapshot.id) {
            migrated[name] = snapshot;
        } else {
            changed = true;
            migrated[name] = { ...snapshot, id: crypto.randomUUID() };
        }
    }
    return changed ? { ...library, character: migrated } : library;
}

function loadStoredLibrary(): PresetLibrary {
    const stored = readJSON<PresetLibrary>(LIBRARY_STORAGE_KEY, {});
    const seeds = JSON.parse(JSON.stringify(ENTITY_PRESET_SEEDS)) as PresetLibrary;
    const merged: PresetLibrary = {};
    for (const entityType of new Set([...Object.keys(seeds), ...Object.keys(stored)])) {
        merged[entityType] = {
            ...(seeds[entityType] ?? {}),
            ...(stored[entityType] ?? {}),
        };
    }
    return migrateCharacterIds(merged);
}

interface PresetLibraryCtx {
    library: PresetLibrary;
    addPreset: (entityType: string, name: string, snapshot: Record<string, unknown>) => void;
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
        (entityType: string, name: string, snapshot: Record<string, unknown>) => {
            setLibrary((lib) => ({
                ...lib,
                [entityType]: { ...(lib[entityType] ?? {}), [name]: snapshot },
            }));
        },
        [],
    );

    const ctx: PresetLibraryCtx = { library, addPreset };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
