import { createContext, useCallback, useContext, useState } from "react";
import { useToastContext } from "./ToastContext.tsx";
import { readJSON, writeJSON } from "../../core/browserStorage.ts";

const NARRATIVE_SETTINGS_KEY = "hv_narrative_settings";

export interface SceneNarrativeSettings {
    emotionalTrend: number; // slope percentage (-100 to 100)
    conflictType: "physical" | "psychological";
    conflictTarget: "man_vs_man" | "man_vs_nature" | "man_vs_society";
    storyPhase: "exposition" | "inciting" | "rising" | "climax" | "resolution";
    tensionLevel: number; // 0 to 100
    pacing: "slow" | "moderate" | "fast" | "action";
    loreRevelations: string[]; // array of tags
    curveType: "linear" | "ease_in" | "ease_out" | "ease_in_out";
}

export const DEFAULT_NARRATIVE_SETTINGS: SceneNarrativeSettings = {
    emotionalTrend: 0,
    conflictType: "physical",
    conflictTarget: "man_vs_man",
    storyPhase: "exposition",
    tensionLevel: 30,
    pacing: "moderate",
    loreRevelations: [],
    curveType: "linear",
};

interface NarrativeCtx {
    narrativeSettings: Record<string, SceneNarrativeSettings>;
    getSceneNarrativeSettings: (sceneId: string) => SceneNarrativeSettings;
    updateNarrativeSettings: (sceneId: string, patch: Partial<SceneNarrativeSettings>) => void;
}

const Ctx = createContext<NarrativeCtx>(null!);
export const useNarrativeContext = () => useContext(Ctx);

export function NarrativeProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToastContext();

    const [narrativeSettings, setNarrativeSettings] = useState<
        Record<string, SceneNarrativeSettings>
    >(() => readJSON(NARRATIVE_SETTINGS_KEY, {} as Record<string, SceneNarrativeSettings>));

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
