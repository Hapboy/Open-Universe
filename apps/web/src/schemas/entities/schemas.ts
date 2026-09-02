import type { z } from "zod";
import type { NodeType } from "@hayverse/shared";
import {
    characterParamsSchema,
    characterDefaults,
    characterVisualKeys,
} from "@/schemas/entities/character.schema.ts";
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
import { includedPhotos, paramReaches } from "@/schemas/entities/schemaHelpers.ts";
import type { EntityPhoto } from "@/schemas/entities/schemaHelpers.ts";

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

// Which of an entity type's params describe how it *looks*, for the one case
// that needs a narrower view than the JSON pin: composing an image prompt from
// a single entity (core/scenePrompt.ts's entityFromNode). Only registered for
// types that can generate their own photo — a type with no entry falls back to
// its full JSON payload, which is what output_scene has always used.
export const ENTITY_VISUAL_KEYS: Partial<Record<NodeType, readonly string[]>> = {
    character: characterVisualKeys,
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

// Params that actually differ from this entity type's defaults — the base
// filter under `entityJsonPayload` below, which both consumers use. Falls back
// to returning params unfiltered for any type with no registered schema (never
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

// What an entity node actually publishes about itself: everything a user
// filled in, minus the keys PARAM_AUDIENCE marks as editor/identity/generation
// bookkeeping (schemaHelpers.ts). Used by core/graph.ts's entity output pin —
// and therefore by every prompt composed from connected entities, see
// core/scenePrompt.ts — and by NodeCard.tsx's "show JSON" preview, which reads
// the same function so the preview can't drift from what downstream nodes see.
export function entityJsonPayload(
    nodeType: NodeType,
    params: Record<string, unknown>,
): Record<string, unknown> {
    const payload = Object.fromEntries(
        Object.entries(filledEntityParams(nodeType, params)).filter(([key]) =>
            paramReaches(key, "json"),
        ),
    );
    // Photos publish only what's included, and only the descriptive half of
    // each entry — `include` is an editor toggle, meaningless downstream.
    if (Array.isArray(payload.photos)) {
        payload.photos = includedPhotos(payload.photos as EntityPhoto[]).map(
            ({ ref, caption, role }) => ({
                ref,
                ...(caption ? { caption } : {}),
                ...(role ? { role } : {}),
            }),
        );
    }
    return payload;
}

// The same payload narrowed to what an image model should hear about — see
// ENTITY_VISUAL_KEYS above for why this exists as a separate, per-type view.
export function entityVisualPayload(
    nodeType: NodeType,
    params: Record<string, unknown>,
): Record<string, unknown> {
    const payload = entityJsonPayload(nodeType, params);
    const visualKeys = ENTITY_VISUAL_KEYS[nodeType];
    if (!visualKeys) return payload;
    const visual = Object.fromEntries(
        Object.entries(payload).filter(([key]) => visualKeys.includes(key)),
    );
    // The photos themselves go to the image model as reference images, not as
    // text — so only what they're *described* as is worth spending prompt
    // tokens on. A ref is an opaque uuid; an undescribed photo says nothing.
    if (Array.isArray(visual.photos)) {
        const described = (visual.photos as { caption?: string; role?: string }[])
            .map(({ caption, role }) => ({
                ...(caption ? { caption } : {}),
                ...(role ? { role } : {}),
            }))
            .filter((p) => Object.keys(p).length > 0);
        if (described.length > 0) visual.photos = described;
        else delete visual.photos;
    }
    return visual;
}
