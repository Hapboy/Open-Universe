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

// Single source of truth for this node type's param shape, validation, and
// defaults — replaces the former NODE_TEMPLATES.character.params (data/
// nodes.ts) and the hand-written CharacterNodeParams interface (types.ts).
// See GraphContext.tsx's templateParams, which now sources entity defaults
// from `characterDefaults` below.
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
};
