import type { z } from "zod";
import type { NodeType } from "@hayverse/shared";
import { characterParamsSchema, characterDefaults } from "@/schemas/entities/character.schema.ts";
import { locationParamsSchema, locationDefaults } from "@/schemas/entities/location.schema.ts";
import {
    miseEnSceneParamsSchema,
    miseEnSceneDefaults,
} from "@/schemas/entities/miseEnScene.schema.ts";
import { buildingParamsSchema, buildingDefaults } from "@/schemas/entities/building.schema.ts";
import { clothingParamsSchema, clothingDefaults } from "@/schemas/entities/clothing.schema.ts";
import { artworkParamsSchema, artworkDefaults } from "@/schemas/entities/artwork.schema.ts";
import { furnitureParamsSchema, furnitureDefaults } from "@/schemas/entities/furniture.schema.ts";
import { musicParamsSchema, musicDefaults } from "@/schemas/entities/music.schema.ts";
import { scriptParamsSchema, scriptDefaults } from "@/schemas/entities/script.schema.ts";
import {
    storyboardParamsSchema,
    storyboardDefaults,
} from "@/schemas/entities/storyboard.schema.ts";
import { transportParamsSchema, transportDefaults } from "@/schemas/entities/transport.schema.ts";

// Single lookup covering all 11 entity node types — used by
// GraphContext.tsx's templateParams/createNode (defaults) and by
// EntityParams.tsx/shared.tsx's usePresetDatabase (schema, for RHF's
// resolver and the save-as-preset validation check). Keeping both registries
// here, one file, means adding a 12th entity type later can't forget one of
// the two.
export const ENTITY_PARAM_SCHEMAS: Partial<Record<NodeType, z.ZodObject<z.ZodRawShape>>> = {
    character: characterParamsSchema,
    location: locationParamsSchema,
    mise_en_scene: miseEnSceneParamsSchema,
    building: buildingParamsSchema,
    clothing: clothingParamsSchema,
    artwork: artworkParamsSchema,
    furniture: furnitureParamsSchema,
    music: musicParamsSchema,
    script: scriptParamsSchema,
    storyboard: storyboardParamsSchema,
    transport: transportParamsSchema,
};

export const ENTITY_PARAM_DEFAULTS: Partial<Record<NodeType, Record<string, unknown>>> = {
    character: characterDefaults,
    location: locationDefaults,
    mise_en_scene: miseEnSceneDefaults,
    building: buildingDefaults,
    clothing: clothingDefaults,
    artwork: artworkDefaults,
    furniture: furnitureDefaults,
    music: musicDefaults,
    script: scriptDefaults,
    storyboard: storyboardDefaults,
    transport: transportDefaults,
};

// Params that actually differ from this entity type's defaults — used by
// core/graph.ts's "JSON" output pin and NodeCard.tsx's "show JSON" preview,
// which both used to spread every param unconditionally (including blank/
// untouched fields like a fresh node's `emotion: ""`). Falls back to
// returning params unfiltered for any type with no registered schema (never
// happens for entity types in practice, callers gate on ENTITY_NODE_TYPES
// first) rather than silently dropping everything.
export function filledEntityParams(
    nodeType: NodeType,
    params: Record<string, unknown>,
): Record<string, unknown> {
    const defaults = ENTITY_PARAM_DEFAULTS[nodeType];
    if (!defaults) return params;
    return Object.fromEntries(
        Object.entries(params).filter(
            ([key, value]) =>
                !(key in defaults) || JSON.stringify(value) !== JSON.stringify(defaults[key]),
        ),
    );
}
