import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Preset } from "@hayverse/api-client";
import { ENTITY_PRESET_SEEDS } from "../../data/presets.ts";
import type { EntityPresets } from "../../types.ts";
import { useToastContext } from "./ToastContext.tsx";
import { readJSON } from "../../core/browserStorage.ts";
import { useDebouncedPersist } from "../hooks/usePersistedState.ts";
import { hayverseApiClient } from "../../core/api/hayverse/client.ts";

const LIBRARY_STORAGE_KEY = "hv_preset_library";

// Entity types whose preset library has moved to the backend (PresetsModule)
// — see apps/api/src/database/migrations/*SeedInitialPresets.ts. Presets of
// these types are read from and saved to the backend exclusively: never
// merged from ENTITY_PRESET_SEEDS, never persisted to LIBRARY_STORAGE_KEY.
// Extend this set — and delete that entity type's block from
// data/presets.ts — each time a new type gets its own backend migration.
const BACKEND_ENTITY_TYPES = new Set(["character", "location", "mise_en_scene"]);

type PresetLibrary = Record<string, EntityPresets>;

function omitBackendTypes(library: PresetLibrary): PresetLibrary {
    const result: PresetLibrary = {};
    for (const [entityType, entries] of Object.entries(library)) {
        if (!BACKEND_ENTITY_TYPES.has(entityType)) result[entityType] = entries;
    }
    return result;
}

// Groups the backend's flat preset list by entityType. Filtered to
// BACKEND_ENTITY_TYPES defensively — every row already has one of these
// types today, since that's the only thing any SeedInitialPresets migration
// or onSave below has ever written. `name` is folded back into the snapshot
// object here — the backend keeps it as its own column (queryable/orderable
// independent of the untyped jsonb blob), but every frontend call site that
// reads a stored preset (onSelect's param spread, this file's label
// building) expects to find it inside the snapshot, same as a local preset.
function groupBackendPresets(rows: Preset[]): PresetLibrary {
    const grouped: PresetLibrary = {};
    for (const row of rows) {
        if (!BACKEND_ENTITY_TYPES.has(row.entityType)) continue;
        grouped[row.entityType] ??= {};
        grouped[row.entityType][row.id] = { ...row.snapshot, name: row.name };
    }
    return grouped;
}

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

// Local (non-backend-wired) entity types only — BACKEND_ENTITY_TYPES are
// excluded from `stored` up front so a pre-cutover localStorage blob that
// still has old character/location/mise_en_scene entries can't resurrect a
// stale duplicate library entry alongside the real backend rows.
function loadStoredLibrary(): PresetLibrary {
    const stored = omitBackendTypes(readJSON<PresetLibrary>(LIBRARY_STORAGE_KEY, {}));
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
    // SSR-safe default: seeds only, no localStorage/backend access — identical
    // on the server and the client's first paint. The real (migrated, stored,
    // backend-fetched) library loads in the mount effect below. AppProviders.tsx
    // deliberately nests this provider inside GraphProvider so this effect
    // fires before GraphContext's own hydration populates `nodes` — see the
    // comment there for why that ordering matters.
    const [library, setLibrary] = useState<PresetLibrary>(
        () => JSON.parse(JSON.stringify(ENTITY_PRESET_SEEDS)) as PresetLibrary,
    );

    useEffect(() => {
        // Syncing from localStorage/the backend, external systems unreadable
        // at render time on the server; this is the documented valid case
        // for the rule.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLibrary(loadStoredLibrary());

        hayverseApiClient.presets
            .list()
            .then((rows) => {
                setLibrary((lib) => ({ ...lib, ...groupBackendPresets(rows) }));
            })
            .catch(() => showToast("Не удалось загрузить пресеты с сервера"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useDebouncedPersist(LIBRARY_STORAGE_KEY, () => omitBackendTypes(library), [library], {
        onError: () =>
            showToast("Не удалось сохранить пресеты локально (превышен лимит хранилища)"),
    });

    const addPreset = useCallback(
        (entityType: string, presetId: string, snapshot: Record<string, unknown>) => {
            if (BACKEND_ENTITY_TYPES.has(entityType)) {
                // presetId is dropped from the stored snapshot — the backend
                // row's own id is the sole identity now (see the
                // SeedInitialPresets migration's comment). Keeping a stale
                // copy embedded in the snapshot risks onSelect's param spread
                // (usePresetDatabase in shared.tsx) clobbering a freshly
                // assigned id with an old one.
                const { presetId: _presetId, ...rest } = snapshot;
                setLibrary((lib) => ({
                    ...lib,
                    [entityType]: { ...(lib[entityType] ?? {}), [presetId]: rest },
                }));
                hayverseApiClient.presets
                    .upsert({ id: presetId, entityType, name: rest.name as string, snapshot: rest })
                    .catch(() => showToast("Не удалось сохранить пресет на сервере"));
                return;
            }

            setLibrary((lib) => ({
                ...lib,
                [entityType]: { ...(lib[entityType] ?? {}), [presetId]: snapshot },
            }));
        },
        [showToast],
    );

    const ctx: PresetLibraryCtx = { library, addPreset };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
