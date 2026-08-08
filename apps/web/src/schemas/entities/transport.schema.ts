import { z } from "zod";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
} from "./schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const transportParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    inFrame: z.boolean(),
});

export type TransportNodeParams = z.infer<typeof transportParamsSchema> & Record<string, unknown>;

export const transportDefaults: TransportNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    inFrame: false, // the one entity type that defaults out-of-frame
};
