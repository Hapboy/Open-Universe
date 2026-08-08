import { z } from "zod";
import type { WGS84Coordinates } from "../../types.ts";

// A select-style field backed by one of @hayverse/shared's `as const` enum
// arrays (e.g. LOCATION_WEATHERS). "" is a first-class member here, not a
// `.catch()` fallback — every entity select field legitimately starts
// unselected, so picking `values[0]` as a fake default would misrepresent an
// untouched field as a real choice. Keeping this strict (no `.catch()`) means
// an actually-malformed value (neither "" nor a real option) is a genuine
// validation error, not silently swallowed.
export function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
    return z.union([z.enum(values), z.literal("")]);
}

// Mirrors WGS84Coordinates (types.ts). `{ lat: null, lon: null }` (not set)
// is a first-class value, same reasoning as optionalEnum above.
export const coordinatesSchema: z.ZodType<WGS84Coordinates> = z.object({
    lat: z.number().nullable(),
    lon: z.number().nullable(),
});
export const coordinatesDefault: WGS84Coordinates = { lat: null, lon: null };

// Identity fields every one of the 11 entity types has. `name` is genuinely
// required (not just defaulted to "") — the same rule `shared.tsx`'s old
// `missingSaveFields` enforced by hand; it now lives on the schema so
// "well-formed" and "saveable as a preset" are one concept instead of two
// parallel checks (see usePresetDatabase in shared.tsx).
export const entityIdentityShape = {
    presetId: z.string(),
    selectedItem: z.string(),
    name: z.string().min(1, "Укажите имя"),
};
export const entityIdentityDefaults = { presetId: "", selectedItem: "", name: "" };

// Photo-gallery fields shared by every entity type except `storyboard`.
// `photos` is required for the same save-time reason as `name` above.
export const entityPhotoShape = {
    photos: z.array(z.string()).min(1, "Добавьте фото"),
    coverPhotoIndex: z.number(),
};
export const entityPhotoDefaults: { photos: string[]; coverPhotoIndex: number } = {
    photos: [],
    coverPhotoIndex: 0,
};
