import { z } from "zod";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
} from "@/schemas/entities/schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const artworkParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    inFrame: z.boolean(),
    scale: z.number(),
});

export type ArtworkNodeParams = z.infer<typeof artworkParamsSchema> & Record<string, unknown>;

export const artworkDefaults: ArtworkNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    inFrame: true,
    scale: 20, // matches the RangeField's own min in EntityParams.tsx
};
