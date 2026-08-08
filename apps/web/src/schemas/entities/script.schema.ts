import { z } from "zod";
import { SCRIPT_TONES } from "@hayverse/shared";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
    optionalEnum,
} from "./schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const scriptParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    tone: optionalEnum(SCRIPT_TONES),
});

export type ScriptNodeParams = z.infer<typeof scriptParamsSchema> & Record<string, unknown>;

export const scriptDefaults: ScriptNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    tone: "",
};
