import { z } from "zod";
import { PHOTO_ROLES } from "@hayverse/shared";
import type { WGS84Coordinates } from "@/types.ts";

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

// Which consumer a param is allowed to reach. An entity node's `params` mixes
// real content (the stuff a prompt or a downstream node should see) with
// editor bookkeeping, identity, and generation config — and it isn't a binary
// local/shared split: `coverPhotoIndex` belongs in a preset (its card thumb is
// `snap.photos[snap.coverPhotoIndex]`, see shared.tsx) but must never reach a
// prompt. Unlisted keys are content, reaching everything; list a key here only
// to take something away, so adding a param is a conscious decision with a
// sane default. Read by `entityJsonPayload` (schemas.ts) and
// `buildPresetSnapshot` (shared.tsx) — the two hand-rolled denylists this
// replaced.
//
// Deliberately not generalized past entity nodes: `gemini_*` nodes have no
// JSON output pin (their params are all generation inputs) and `output_scene`
// already namespaces its config under `params.image`/`params.video`.
const PARAM_AUDIENCE: Record<string, { json?: boolean; preset?: boolean }> = {
    selectedItem: { json: false, preset: false }, // which preset is loaded — circular in a snapshot
    presetId: { json: false, preset: false }, // identity; the snapshot is already keyed by it
    coverPhotoIndex: { json: false, preset: true }, // preset cards need it, prompts don't
    photoGen: { json: false, preset: true }, // Nano Banana config for this entity's own generation
    promptComposition: { json: false, preset: true }, // raw/llm switch for that generation
};

export function paramReaches(key: string, audience: "json" | "preset"): boolean {
    return PARAM_AUDIENCE[key]?.[audience] !== false;
}

// One photo in an entity's gallery. `ref` is a media ref (`s3:<uuid>`) or, for
// mise_en_scene's staging diagrams, a static asset path — it doubles as the
// photo's identity (its output pin id derives from it, see characterPorts.ts).
//
// `include` decides whether this photo reaches the entity's JSON output pin
// and the reference-image list of any generation composed from it — an editor
// concern, so it never leaves the node itself (entityJsonPayload drops it).
// Written explicitly rather than left optional-means-true so reads stay a
// plain `photos.filter((p) => p.include)`; the `.default(true)` is only a
// guard for hand-edited rows. `caption`/`role` describe what the photo shows,
// and both do reach prompts.
export const photoEntrySchema = z.object({
    ref: z.string(),
    include: z.boolean().default(true),
    caption: z.string().optional(),
    role: optionalEnum(PHOTO_ROLES).optional(),
});
export type EntityPhoto = z.infer<typeof photoEntrySchema>;

// Photo-gallery fields shared by every entity type except `storyboard`.
// `photos` is required for the same save-time reason as `name` above.
export const entityPhotoShape = {
    photos: z.array(photoEntrySchema).min(1, "Добавьте фото"),
    coverPhotoIndex: z.number(),
};
export const entityPhotoDefaults: { photos: EntityPhoto[]; coverPhotoIndex: number } = {
    photos: [],
    coverPhotoIndex: 0,
};

// Gallery cap, enforced in one place (GraphContext's setNodePhotos) and read by
// everything that offers to add a photo — upload, media library, accepting a
// generated variant.
export const MAX_ENTITY_PHOTOS = 10;

// The included subset, in gallery order — what every consumer outside the
// node's own editor should look at.
export function includedPhotos(photos: EntityPhoto[] | undefined): EntityPhoto[] {
    return (photos ?? []).filter((p) => p.include);
}
