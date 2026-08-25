import type { Port } from "@/types.ts";
import type { EntityPhoto } from "@/schemas/entities/schemaHelpers.ts";

// Photo output pins are identified by the photo's own blob ref (already a
// unique id), not by array position — so deleting one photo only drops that
// one pin/edge, leaving every other photo's wiring untouched.
export function photoPortId(nodeId: string, ref: string): string {
    return `${nodeId}_photo_${ref}`;
}

// Every photo gets a pin, `include: false` ones too: excluding a photo keeps
// it out of composed prompts, but manual wiring is an explicit act and stays
// available (see schemaHelpers.ts's photoEntrySchema).
export function buildPhotoPorts(nodeId: string, photos: EntityPhoto[]): Port[] {
    return photos.map((photo, i) => ({
        id: photoPortId(nodeId, photo.ref),
        name: `Photo ${i + 1}`,
        type: "Image",
    }));
}
