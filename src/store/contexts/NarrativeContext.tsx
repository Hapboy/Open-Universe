import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useToastContext } from "./ToastContext.tsx";
import { readJSON, writeJSON } from "../../core/browserStorage.ts";
import type {
    ConflictType,
    ConflictTarget,
    StoryPhase,
    Pacing,
    CurveType,
} from "../../types/enums.ts";

const NARRATIVE_SETTINGS_KEY = "hv_narrative_settings";

export interface SceneNarrativeSettings {
    emotionalTrend: number; // slope percentage (-100 to 100)
    conflictType: ConflictType;
    conflictTarget: ConflictTarget;
    storyPhase: StoryPhase;
    tensionLevel: number; // 0 to 100
    pacing: Pacing;
    loreRevelations: string[]; // array of tags
    curveType: CurveType;
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
