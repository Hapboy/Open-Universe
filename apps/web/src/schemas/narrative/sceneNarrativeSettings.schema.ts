import { z } from "zod";
import {
    CONFLICT_TYPES,
    CONFLICT_TARGETS,
    STORY_PHASES,
    PACING_VALUES,
    CURVE_TYPES,
    type StoryPhase,
} from "@hayverse/shared";

const STORY_PHASE_KEYS = STORY_PHASES.map((p) => p.key) as [StoryPhase, ...StoryPhase[]];

// Single source of truth for SceneNarrativeSettings' shape, validation, and
// defaults — same role character.schema.ts etc play for entity node params.
// NarrativeContext.tsx re-exports `SceneNarrativeSettings`/
// `DEFAULT_NARRATIVE_SETTINGS` under those established names so nothing
// outside this file and NarrativeContext.tsx needs to know the schema moved
// here.
export const sceneNarrativeSettingsSchema = z.object({
    emotionalTrend: z.number().min(-100).max(100), // slope percentage
    conflictType: z.enum(CONFLICT_TYPES),
    conflictTarget: z.enum(CONFLICT_TARGETS),
    storyPhase: z.enum(STORY_PHASE_KEYS),
    tensionLevel: z.number().min(0).max(100),
    pacing: z.enum(PACING_VALUES),
    loreRevelations: z.array(z.string()),
    curveType: z.enum(CURVE_TYPES),
});

export type SceneNarrativeSettings = z.infer<typeof sceneNarrativeSettingsSchema>;

export const sceneNarrativeSettingsDefaults: SceneNarrativeSettings = {
    emotionalTrend: 0,
    conflictType: "physical",
    conflictTarget: "man_vs_man",
    storyPhase: "exposition",
    tensionLevel: 0,
    pacing: "moderate",
    loreRevelations: [],
    curveType: "linear",
};
