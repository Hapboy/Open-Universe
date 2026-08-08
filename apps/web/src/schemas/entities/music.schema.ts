import { z } from "zod";
import { MUSIC_MOODS } from "@hayverse/shared";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
    optionalEnum,
} from "./schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const musicParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    mood: optionalEnum(MUSIC_MOODS),
});

export type MusicNodeParams = z.infer<typeof musicParamsSchema> & Record<string, unknown>;

export const musicDefaults: MusicNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    mood: "",
};
