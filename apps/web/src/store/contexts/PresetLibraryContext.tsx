import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Preset } from "@hayverse/api-client";
import type { EntityPresets } from "@/types.ts";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";
import { removeKey } from "@/core/browserStorage.ts";
import { hayverseApiClient } from "@/core/api/hayverse/client.ts";

// Pre-cutover leftover key: every entity type's preset library now lives
// exclusively in the backend (PresetsModule) — this is only referenced once
// below, to clean up whatever a browser saved here before that was true.
const LIBRARY_STORAGE_KEY = "hv_preset_library";

type PresetLibrary = Record<string, EntityPresets>;

// Groups the backend's flat preset list by entityType. `name` is folded back
// into the snapshot object here — the backend keeps it as its own column
// (queryable/orderable independent of the untyped jsonb blob), but every
// frontend call site that reads a stored preset (onSelect's param spread,
// this file's label building) expects to find it inside the snapshot.
function groupBackendPresets(rows: Preset[]): PresetLibrary {
    const grouped: PresetLibrary = {};
    for (const row of rows) {
        grouped[row.entityType] ??= {};
        grouped[row.entityType][row.id] = { ...row.snapshot, name: row.name };
    }
    return grouped;
}

interface PresetLibraryCtx {
    library: PresetLibrary;
    // True until the initial `presets.list()` call settles. A node can render
    // with a valid, saved `presetId` before this resolves (see
    // GraphContext.tsx's synchronous `seedFromPrefetched` seed) — callers use
    // this to show "still checking" instead of wrongly claiming "no match".
    isLoading: boolean;
    addPreset: (entityType: string, presetId: string, snapshot: Record<string, unknown>) => void;
    removePreset: (entityType: string, presetId: string) => void;
}

const Ctx = createContext<PresetLibraryCtx>(null!);
export const usePresetLibraryContext = () => useContext(Ctx);

export function PresetLibraryProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToastContext();
    // SSR-safe default: empty, no backend access — identical on the server
    // and the client's first paint. The real library loads in the mount
    // effect below. AppProviders.tsx deliberately nests this provider inside
    // GraphProvider so this effect fires before GraphContext's own hydration
    // populates `nodes` — see the comment there for why that ordering matters.
    const [library, setLibrary] = useState<PresetLibrary>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // One-time cleanup: nothing reads this key anymore, so a browser that
        // saved a custom preset here before the backend cutover would
        // otherwise carry a permanently-orphaned blob forever.
        removeKey(LIBRARY_STORAGE_KEY);

        hayverseApiClient.presets
            .list()
            .then((rows) => {
                setLibrary(groupBackendPresets(rows));
            })
            .catch(() => showToast("Не удалось загрузить пресеты с сервера"))
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const addPreset = useCallback(
        (entityType: string, presetId: string, snapshot: Record<string, unknown>) => {
            // presetId is dropped from the stored snapshot — the backend
            // row's own id is the sole identity. Keeping a stale copy
            // embedded in the snapshot risks onSelect's param spread
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
        },
        [showToast],
    );

    const removePreset = useCallback(
        (entityType: string, presetId: string) => {
            setLibrary((lib) => {
                const { [presetId]: _removed, ...rest } = lib[entityType] ?? {};
                return { ...lib, [entityType]: rest };
            });
            hayverseApiClient.presets
                .remove(presetId)
                .catch(() => showToast("Не удалось удалить пресет на сервере"));
        },
        [showToast],
    );

    const ctx: PresetLibraryCtx = { library, isLoading, addPreset, removePreset };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
