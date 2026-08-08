import { z } from "zod";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
} from "./schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const furnitureParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    inFrame: z.boolean(),
    density: z.number(),
});

export type FurnitureNodeParams = z.infer<typeof furnitureParamsSchema> & Record<string, unknown>;

export const furnitureDefaults: FurnitureNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    inFrame: true,
    density: 1, // matches the RangeField's own min in EntityParams.tsx
};
