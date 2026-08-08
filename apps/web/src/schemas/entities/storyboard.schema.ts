import { z } from "zod";
import { entityIdentityShape, entityIdentityDefaults } from "@/schemas/entities/schemaHelpers.ts";

// The one entity type with no photo gallery — identity fields only, no
// entityPhotoShape (see character.schema.ts for the general pattern).
export const storyboardParamsSchema = z.object({
    ...entityIdentityShape,
    shots: z.number(),
});

export type StoryboardNodeParams = z.infer<typeof storyboardParamsSchema> & Record<string, unknown>;

export const storyboardDefaults: StoryboardNodeParams = {
    ...entityIdentityDefaults,
    shots: 0,
};
