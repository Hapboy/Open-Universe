import { z } from "zod";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
} from "./schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const buildingParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    inFrame: z.boolean(),
    floor: z.number(),
});

export type BuildingNodeParams = z.infer<typeof buildingParamsSchema> & Record<string, unknown>;

export const buildingDefaults: BuildingNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    inFrame: true,
    floor: 0,
};
