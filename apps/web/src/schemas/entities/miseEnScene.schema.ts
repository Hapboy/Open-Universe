import { z } from "zod";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
} from "@/schemas/entities/schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const miseEnSceneParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    peopleCount: z.number(),
    cameraCount: z.number(),
    additionalDescription: z.string(),
});

export type MiseEnSceneNodeParams = z.infer<typeof miseEnSceneParamsSchema> &
    Record<string, unknown>;

export const miseEnSceneDefaults: MiseEnSceneNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    peopleCount: 0,
    cameraCount: 0,
    additionalDescription: "",
};
