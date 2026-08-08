import type { Port } from "@/types.ts";

// Photo output pins are identified by the photo's own blob ref (already a
// unique id), not by array position — so deleting one photo only drops that
// one pin/edge, leaving every other photo's wiring untouched.
export function photoPortId(nodeId: string, ref: string): string {
    return `${nodeId}_photo_${ref}`;
}

export function buildPhotoPorts(nodeId: string, photos: string[]): Port[] {
    return photos.map((ref, i) => ({
        id: photoPortId(nodeId, ref),
        name: `Photo ${i + 1}`,
        type: "Image",
    }));
}
