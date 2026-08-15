import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";
import { readJSON, writeJSON } from "@/core/browserStorage.ts";
import {
    sceneNarrativeSettingsDefaults,
    type SceneNarrativeSettings,
} from "@/schemas/narrative/sceneNarrativeSettings.schema.ts";

export type { SceneNarrativeSettings };

const NARRATIVE_SETTINGS_KEY = "hv_narrative_settings";

// Re-exported under this established name — shape/validation/defaults now
// live in schemas/narrative/sceneNarrativeSettings.schema.ts (single source
// of truth, same role character.schema.ts etc play for entity params), kept
// under this name here since every consumer already imports it as
// `DEFAULT_NARRATIVE_SETTINGS` from this module.
export const DEFAULT_NARRATIVE_SETTINGS = sceneNarrativeSettingsDefaults;

interface NarrativeCtx {
    narrativeSettings: Record<string, SceneNarrativeSettings>;
    getSceneNarrativeSettings: (sceneId: string) => SceneNarrativeSettings;
    updateNarrativeSettings: (sceneId: string, patch: Partial<SceneNarrativeSettings>) => void;
}

const Ctx = createContext<NarrativeCtx>(null!);
export const useNarrativeContext = () => useContext(Ctx);

export function NarrativeProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToastContext();

    // SSR-safe default (no localStorage access during render); the real
    // stored settings load in the mount effect below.
    const [narrativeSettings, setNarrativeSettings] = useState<
        Record<string, SceneNarrativeSettings>
    >({});

    useEffect(() => {
        // Syncing from localStorage, an external system unreadable at render
        // time on the server; this is the documented valid case for the rule.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNarrativeSettings(
            readJSON(NARRATIVE_SETTINGS_KEY, {} as Record<string, SceneNarrativeSettings>),
        );
    }, []);

    const getSceneNarrativeSettings = useCallback(
        (sceneId: string) => ({ ...DEFAULT_NARRATIVE_SETTINGS, ...narrativeSettings[sceneId] }),
        [narrativeSettings],
    );

    const updateNarrativeSettings = useCallback(
        (sceneId: string, patch: Partial<SceneNarrativeSettings>) => {
            const base = { ...DEFAULT_NARRATIVE_SETTINGS, ...narrativeSettings[sceneId] };
            const updated = { ...narrativeSettings, [sceneId]: { ...base, ...patch } };
            writeJSON(NARRATIVE_SETTINGS_KEY, updated, () =>
                showToast("Не удалось сохранить настройки сцены (превышен лимит хранилища)"),
            );
            setNarrativeSettings(updated);
        },
        [narrativeSettings, showToast],
    );

    const ctx: NarrativeCtx = {
        narrativeSettings,
        getSceneNarrativeSettings,
        updateNarrativeSettings,
    };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
