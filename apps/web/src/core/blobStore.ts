// Local blob storage for media that shouldn't live in localStorage:
// uploaded/reference media (character photos, scene covers) and generated
// AI images, each in their own IndexedDB object store. localStorage's
// ~5-10MB per-origin quota gets blown through almost instantly once media
// is embedded as base64 in node params, while IndexedDB is built for blobs
// and has a much larger quota. Node params store a short ref instead of the
// raw bytes; `resolveMediaRef`/`resolveMediaRefCached` turn a ref back into
// a usable URL. Legacy raw `data:`/`http(s)` strings already saved before
// this module existed pass straight through unchanged, so no migration of
// existing data is needed.
//
// Swapping this for a real backend later only means changing this module's
// internals (upload to the server, ref becomes a real object-storage key),
// not every call site — same intent as browserStorage.ts.

import { useEffect, useState } from "react";
import { hayverseApiClient } from "./api/hayverse/client.ts";
import { getR2PublicUrl } from "./api/env.ts";

const DB_NAME = "hv_media_store";
const DB_VERSION = 2;

// Two separate tables: "uploaded" is user-provided media (photos, covers),
// "generated" is AI output the app chooses to cache for redisplay. Kept
// distinct since they'll likely have different ownership/retention rules
// once a real backend exists.
//
// Both "uploaded" and "generated" are backend-first now (see putBlob/
// putGeneratedBlob below) — MediaModule's s3:<uuid> refs, resolved
// deterministically below, never touch these IndexedDB tables for new
// writes. They're kept only so refs already saved under the old idb:/gen:
// schemes (before each cutover) keep resolving.
const STORES = { uploaded: "blobs", generated: "generated" } as const;
const PREFIXES = { uploaded: "idb:", generated: "gen:", backend: "s3:" } as const;
type Kind = keyof typeof STORES;

function isMediaRef(value: unknown): value is string {
    return (
        typeof value === "string" &&
        (value.startsWith(PREFIXES.uploaded) ||
            value.startsWith(PREFIXES.generated) ||
            value.startsWith(PREFIXES.backend))
    );
}

// MediaModule's ref format doubles as its R2 object key (see
// apps/api/src/media/media.service.ts's storageKey) — the public URL is
// deterministic, computed the same way MediaService.publicUrl() does
// server-side, so resolving one never needs an extra API round-trip.
function backendRefToUrl(ref: string): string {
    return `${getR2PublicUrl().replace(/\/$/, "")}/${ref}`;
}

function storeForRef(ref: string): string | undefined {
    if (ref.startsWith(PREFIXES.uploaded)) return STORES.uploaded;
    if (ref.startsWith(PREFIXES.generated)) return STORES.generated;
    return undefined;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                for (const name of Object.values(STORES)) {
                    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    return dbPromise;
}

async function getBlob(ref: string): Promise<Blob | undefined> {
    const storeName = storeForRef(ref);
    if (!storeName) return undefined;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, "readonly").objectStore(storeName).get(ref);
        req.onsuccess = () => resolve(req.result as Blob | undefined);
        req.onerror = () => reject(req.error);
    });
}

// Uploads a file to the backend (MediaModule -> R2) and returns its ref.
// Callers push this ref into node params instead of the raw bytes. Returns
// the same s3:<uuid> shape putBlobAs used to hand back for the old
// IndexedDB-backed path, so callers need no changes.
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

// object URLs are cached per ref for the life of the session — re-resolving
// the same ref (e.g. re-running the graph) never re-reads IndexedDB or
// creates a duplicate URL.
const objectUrlCache = new Map<string, string>();

// Synchronous, cache-only lookup: legacy strings resolve instantly, backend
// refs resolve instantly too (deterministic URL, no IndexedDB round-trip),
// idb:/gen: refs resolve instantly only if already loaded once this session.
// Lets render-site hooks show a value on the very first render.
export function resolveMediaRefCached(ref: string | undefined): string | undefined {
    if (!ref) return undefined;
    if (ref.startsWith(PREFIXES.backend)) return backendRefToUrl(ref);
    if (!isMediaRef(ref)) return ref;
    return objectUrlCache.get(ref);
}

// Turns a ref into a usable URL, reading from IndexedDB if not cached yet.
// A dangling ref (blob deleted, e.g. by the storage sweep) resolves to the
// ref string itself — an invalid src that just renders as a broken
// image/video, not a crash.
export async function resolveMediaRef(ref: string): Promise<string> {
    if (ref.startsWith(PREFIXES.backend)) return backendRefToUrl(ref);
    if (!isMediaRef(ref)) return ref;
    const cached = objectUrlCache.get(ref);
    if (cached) return cached;
    const blob = await getBlob(ref);
    if (!blob) return ref;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(ref, url);
    return url;
}

// `state.forRef`/`state.forKey` guard against a stale async result overwriting
// a newer `ref`/`refs`: the render-time fallback (`resolveMediaRefCached`)
// covers the mismatch case, so the effect never needs to synchronously reset
// state itself — it only ever calls setState from inside the async callback.

export function useResolvedMediaUrl(ref: string | undefined): string | undefined {
    const [state, setState] = useState<{ forRef: string | undefined; url: string | undefined }>(
        () => ({ forRef: ref, url: resolveMediaRefCached(ref) }),
    );

    useEffect(() => {
        if (!ref) return;
        let cancelled = false;
        resolveMediaRef(ref)
            .then((url) => {
                if (!cancelled) setState({ forRef: ref, url });
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [ref]);

    return state.forRef === ref ? state.url : resolveMediaRefCached(ref);
}

export function useResolvedMediaUrls(refs: string[]): (string | undefined)[] {
    const key = refs.join("|");
    const [state, setState] = useState<{ forKey: string; urls: (string | undefined)[] }>(() => ({
        forKey: key,
        urls: refs.map(resolveMediaRefCached),
    }));

    useEffect(() => {
        let cancelled = false;
        Promise.all(refs.map(resolveMediaRef))
            .then((urls) => {
                if (!cancelled) setState({ forKey: key, urls });
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
        // `key` (refs' joined content) is the real dependency — `refs` itself
        // is a fresh array identity every render since callers build it inline.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return state.forKey === key ? state.urls : refs.map(resolveMediaRefCached);
}

async function listStoreKeys(kind: Kind): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORES[kind], "readonly").objectStore(STORES[kind]).getAllKeys();
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
    });
}

// Counts per table, so the Storage modal can show uploaded vs. generated
// media separately rather than one combined number.
export async function listBlobIds(): Promise<Record<Kind, string[]>> {
    const [uploaded, generated] = await Promise.all([
        listStoreKeys("uploaded"),
        listStoreKeys("generated"),
    ]);
    return { uploaded, generated };
}

export async function deleteBlobs(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const byStore = new Map<string, string[]>();
    for (const id of ids) {
        const storeName = storeForRef(id);
        if (!storeName) continue;
        const bucket = byStore.get(storeName) ?? [];
        bucket.push(id);
        byStore.set(storeName, bucket);
    }
    if (!byStore.size) return;
    const db = await openDB();
    await Promise.all(
        [...byStore.entries()].map(
            ([storeName, storeIds]) =>
                new Promise<void>((resolve, reject) => {
                    const tx = db.transaction(storeName, "readwrite");
                    const store = tx.objectStore(storeName);
                    for (const id of storeIds) store.delete(id);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                }),
        ),
    );
    for (const id of ids) {
        const url = objectUrlCache.get(id);
        if (url) {
            URL.revokeObjectURL(url);
            objectUrlCache.delete(id);
        }
    }
}

// Scans every given params object (node params, preset snapshots) for
// refs — top-level string fields and string arrays — so the sweep below
// never deletes a blob still referenced anywhere. Generic rather than
// hardcoding `photos`/`coverUrl`/`lastGeneratedRef` by name, so it keeps
// working if another field starts using the same ref convention later.
export function collectLiveMediaRefs(...paramsLists: Record<string, unknown>[][]): Set<string> {
    const refs = new Set<string>();
    for (const list of paramsLists) {
        for (const params of list) {
            for (const value of Object.values(params)) {
                if (isMediaRef(value)) {
                    refs.add(value);
                } else if (Array.isArray(value)) {
                    for (const item of value) {
                        if (isMediaRef(item)) refs.add(item);
                    }
                }
            }
        }
    }
    return refs;
}

// Deletes every stored blob (in either table) not present in `liveRefs`.
// Safe by construction (it deletes only what's absent from the full live
// set passed in), so it's exposed as a user-triggered action rather than
// run automatically on every param change.
export async function sweepUnusedBlobs(liveRefs: Set<string>): Promise<number> {
    const { uploaded, generated } = await listBlobIds();
    const unused = [...uploaded, ...generated].filter((id) => !liveRefs.has(id));
    await deleteBlobs(unused);
    return unused.length;
}
