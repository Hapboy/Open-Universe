import { z } from "zod";
import {
    CHARACTER_EMOTIONS,
    CHARACTER_STYLISTS,
    HAIRCUT_VALUES,
    TATTOO_VALUES,
    ACCESSORY_VALUES,
    CHARACTER_CLOTHING_ITEMS,
} from "@hayverse/shared";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
    coordinatesSchema,
    coordinatesDefault,
    optionalEnum,
} from "@/schemas/entities/schemaHelpers.ts";
import {
    nanoBananaSliceSchema,
    nanoBananaSliceDefaults,
} from "@/schemas/gemini/geminiNanoBanana.schema.ts";

// Single source of truth for this node type's param shape, validation, and
// defaults — replaces the former NODE_TEMPLATES.character.params (data/
// nodes.ts) and the hand-written CharacterNodeParams interface (types.ts).
// See GraphContext.tsx's templateParams, which now sources entity defaults
// from `characterDefaults` below.
// Nano Banana config for this character's own "generate a photo" action —
// exactly the fields NanoBananaModelFields edits, minus the prompt (composed
// from the character itself, see core/scenePrompt.ts's entityFromNode). Nested
// rather than flattened for the same reason output_scene nests `params.image`
// (see data/nodes.ts): one slice to hand to the shared component, and one key
// for PARAM_AUDIENCE to keep out of prompts. `.optional()` because characters
// created before this existed have no such key, and both useNodeParamsForm and
// missingSaveFields parse live params — a required field would flag every one
// of them as unsaveable.
export const characterPhotoGenSchema = nanoBananaSliceSchema;
export const characterPhotoGenDefaults = { ...nanoBananaSliceDefaults };

export const characterParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    inFrame: z.boolean(),
    age: z.number().min(10, "Минимум 10 лет").max(90, "Максимум 90 лет"),
    emotion: optionalEnum(CHARACTER_EMOTIONS),
    stylist: optionalEnum(CHARACTER_STYLISTS),
    lifetimeFrom: z.string(),
    lifetimeTo: z.string(),
    birthPlace: coordinatesSchema,
    deathPlace: coordinatesSchema,
    currentPosition: coordinatesSchema,
    arcWho: z.string(),
    arcWants: z.string(),
    arcHow: z.string(),
    arcStake: z.string(),
    haircut: optionalEnum(HAIRCUT_VALUES),
    tattoos: optionalEnum(TATTOO_VALUES),
    accessories: optionalEnum(ACCESSORY_VALUES),
    clothing: optionalEnum(CHARACTER_CLOTHING_ITEMS),
    color: z.string(),
    additionalDescription: z.string(),
    photoGen: characterPhotoGenSchema.optional(),
    // How the photo prompt is built from this character: "raw" serializes its
    // own visual fields as JSON, "llm" turns them into prose first — same two
    // paths (and same default) as output_scene, see core/scenePrompt.ts.
    promptComposition: z.enum(["raw", "llm"]).optional(),
});

export type CharacterNodeParams = z.infer<typeof characterParamsSchema> & Record<string, unknown>;

export const characterDefaults: CharacterNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    inFrame: true,
    age: 0,
    emotion: "",
    stylist: "",
    lifetimeFrom: "",
    lifetimeTo: "",
    birthPlace: coordinatesDefault,
    deathPlace: coordinatesDefault,
    currentPosition: coordinatesDefault,
    arcWho: "",
    arcWants: "",
    arcHow: "",
    arcStake: "",
    haircut: "",
    tattoos: "",
    accessories: "",
    clothing: "",
    color: "",
    additionalDescription: "",
    photoGen: characterPhotoGenDefaults,
    promptComposition: "raw",
};

// The character fields that describe how they *look* — the prompt for a
// portrait, in other words. Everything omitted is either narrative/geo data
// (arc*, lifetime*, birthPlace, deathPlace, currentPosition: noise in an image
// prompt) or handled separately: `additionalDescription` is prepended by
// composeScenePrompt itself, and identity/generation keys never leave the node
// (see PARAM_AUDIENCE). Kept as a declared list rather than the old hardcoded
// sentence template so a new visual field can't be silently forgotten.
export const characterVisualKeys = [
    "name",
    "age",
    "emotion",
    "stylist",
    "haircut",
    "tattoos",
    "accessories",
    "clothing",
    "color",
    "photos",
] as const;
