import { z } from "zod";
import { LOCATION_WEATHERS, LOCATION_TIMES_OF_DAY, INTERIOR_EXTERIOR } from "@hayverse/shared";
import {
    entityIdentityShape,
    entityIdentityDefaults,
    entityPhotoShape,
    entityPhotoDefaults,
    coordinatesSchema,
    coordinatesDefault,
    optionalEnum,
} from "@/schemas/entities/schemaHelpers.ts";

// See character.schema.ts for the pattern this follows.
export const locationParamsSchema = z.object({
    ...entityIdentityShape,
    ...entityPhotoShape,
    weather: optionalEnum(LOCATION_WEATHERS),
    timeOfDay: optionalEnum(LOCATION_TIMES_OF_DAY),
    interiorExterior: optionalEnum(INTERIOR_EXTERIOR),
    damageLevel: z.number(),
    coordinates: coordinatesSchema,
    radiusKm: z.number(),
    additionalDescription: z.string(),
});

export type LocationNodeParams = z.infer<typeof locationParamsSchema> & Record<string, unknown>;

export const locationDefaults: LocationNodeParams = {
    ...entityIdentityDefaults,
    ...entityPhotoDefaults,
    weather: "",
    timeOfDay: "",
    interiorExterior: "",
    damageLevel: 0,
    coordinates: coordinatesDefault,
    radiusKm: 0,
    additionalDescription: "",
};
