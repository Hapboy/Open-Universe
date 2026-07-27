import type { SceneGraphs } from "../../../store/contexts/GraphContext.tsx";
import type { CharacterNodeParams, TimelineScene } from "../../../types.ts";
import type { TimelineTrack } from "@open-universe/shared";

// Curated fallback palette for characters without their own `color` param —
// cycles by order of first appearance across the timeline.
const PALETTE = [
    "#EF9F27",
    "#D4537E",
    "#5DCAA5",
    "#85B7EB",
    "#AFA9EC",
    "#E8845C",
    "#7FD1D1",
    "#C9A6E8",
];

export interface SynapseCharacter {
    key: string;
    name: string;
    color: string;
}

// A "column" of the synapses view: scenes sharing an exact `start` time —
// the same definition of "parallel" already used elsewhere (see
// Timeline.tsx's toggleCamera: `s.start === targetScene.start`). Groups a
// track-1/track-2 pair into one x-position instead of two side-by-side ones.
export interface SynapseColumn {
    start: number;
    byTrack: Partial<Record<TimelineTrack, TimelineScene>>;
}

export function groupScenesByStart(scenes: TimelineScene[]): SynapseColumn[] {
    const columns: SynapseColumn[] = [];
    const byStart = new Map<number, SynapseColumn>();

    for (const scene of scenes) {
        let column = byStart.get(scene.start);
        if (!column) {
            column = { start: scene.start, byTrack: {} };
            byStart.set(scene.start, column);
            columns.push(column);
        }
        column.byTrack[scene.track] = scene;
    }

    return columns;
}

export interface CharacterPresence {
    characters: SynapseCharacter[];
    // sceneId -> identity keys of characters present in that scene
    presenceByScene: Record<string, string[]>;
}

// A character's cross-scene identity: prefer the stable `id` param (see
// PresetLibraryContext's migration), fall back to a normalized name match
// for character nodes placed before that id existed.
function identityKey(params: CharacterNodeParams): string | null {
    if (params.presetId) return params.presetId;
    const name = params.name?.trim().toLowerCase();
    return name ? `name:${name}` : null;
}

export function deriveCharacterPresence(
    scenes: TimelineScene[],
    allSceneGraphs: SceneGraphs,
): CharacterPresence {
    const characters: SynapseCharacter[] = [];
    const seen = new Set<string>();
    const presenceByScene: Record<string, string[]> = {};

    for (const scene of scenes) {
        const nodes = allSceneGraphs[scene.id]?.nodes ?? [];
        const keysInScene = new Set<string>();

        for (const node of nodes) {
            if (node.data?.nodeType !== "character") continue;
            const params = node.data.params as CharacterNodeParams;
            const key = identityKey(params);
            if (!key) continue;
            keysInScene.add(key);

            if (!seen.has(key)) {
                seen.add(key);
                characters.push({
                    key,
                    name: params.name || "Без имени",
                    color: params.color || PALETTE[characters.length % PALETTE.length],
                });
            }
        }

        presenceByScene[scene.id] = [...keysInScene];
    }

    return { characters, presenceByScene };
}
