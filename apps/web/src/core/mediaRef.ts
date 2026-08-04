// Media refs: node params store a short `s3:<uuid>` ref instead of raw bytes;
// `resolveMediaRef`/`resolveMediaRefCached` turn a ref back into a usable
// URL. The ref doubles as the R2 object key (see apps/api's
// MediaService.upload's storageKey), so resolving one is just string
// formatting - no round trip needed. Legacy raw `data:`/`http(s)` strings
// pass straight through unchanged.
//
// This used to also resolve `idb:`/`gen:` refs against an IndexedDB-backed
// local blob store (pre-backend media uploads). That path was cut - any
// node still holding one of those refs just shows a broken image now.

import { hayverseApiClient } from "./api/hayverse/client.ts";
import { getR2PublicUrl } from "./api/env.ts";

const REF_PREFIX = "s3:";

// MediaModule's ref format doubles as its R2 object key (see
// apps/api/src/media/media.service.ts's storageKey) — the public URL is
// deterministic, computed the same way MediaService.publicUrl() does
// server-side, so resolving one never needs an extra API round-trip.
function refToUrl(ref: string): string {
    return `${getR2PublicUrl().replace(/\/$/, "")}/${ref}`;
}

// Uploads a file to the backend (MediaModule -> R2) and returns its ref.
// Callers push this ref into node params instead of the raw bytes.
export function putBlob(file: Blob): Promise<string> {
    return hayverseApiClient.media.upload(file).then((asset) => asset.storageKey);
}

// Stores a generated-media blob (currently: AI images/audio/video from
// AiGatewayModule) and returns its ref. Same backend, distinct `kind` from
// putBlob's uploads (see MediaAssetKind).
export function putGeneratedBlob(file: Blob): Promise<string> {
    return hayverseApiClient.media
        .upload(file, undefined, "generated")
        .then((asset) => asset.storageKey);
}

// Synchronous: backend refs resolve to a deterministic URL, anything else
// (legacy data:/http(s) strings, or a dangling pre-migration ref) passes
// through unchanged - an invalid src just renders as a broken image, not a
// crash.
export function resolveMediaRefCached(ref: string | undefined): string | undefined {
    if (!ref) return undefined;
    return ref.startsWith(REF_PREFIX) ? refToUrl(ref) : ref;
}

export function resolveMediaRef(ref: string): string {
    return ref.startsWith(REF_PREFIX) ? refToUrl(ref) : ref;
}

export function useResolvedMediaUrl(ref: string | undefined): string | undefined {
    return resolveMediaRefCached(ref);
}

export function useResolvedMediaUrls(refs: string[]): (string | undefined)[] {
    return refs.map(resolveMediaRefCached);
}
