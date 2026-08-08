import { z } from "zod";
import { CLOTHING_SEASONS } from "@hayverse/shared";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
    optionalEnum,
} from "@/schemas/entities/schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const clothingParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    season: optionalEnum(CLOTHING_SEASONS),
    wear: z.number(),
});

export type ClothingNodeParams = z.infer<typeof clothingParamsSchema> & Record<string, unknown>;

export const clothingDefaults: ClothingNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    season: "",
    wear: 0,
};
