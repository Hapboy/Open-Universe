// Local blob storage for uploaded/reference media (character photos, scene
// covers), backed by IndexedDB instead of localStorage — localStorage's
// ~5-10MB per-origin quota gets blown through almost instantly once photos
// are embedded as base64 in node params, while IndexedDB is built for blobs
// and has a much larger quota. Node params store a short `idb:<uuid>` ref
// instead of the raw bytes; `resolveMediaRef`/`resolveMediaRefCached` turn a
// ref back into a usable URL. Legacy raw `data:`/`http(s)` strings already
// saved before this module existed pass straight through unchanged, so no
// migration of existing data is needed.
//
// Swapping this for a real backend later only means changing this module's
// internals (upload to the server, ref becomes a real object-storage key),
// not every call site — same intent as browserStorage.ts.

import { useEffect, useState } from "react";

const DB_NAME = "hv_media_store";
const STORE_NAME = "blobs";
const DB_VERSION = 1;
const REF_PREFIX = "idb:";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    return dbPromise;
}

async function getBlob(ref: string): Promise<Blob | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(ref);
        req.onsuccess = () => resolve(req.result as Blob | undefined);
        req.onerror = () => reject(req.error);
    });
}

// Stores a blob and returns its ref. Callers push this ref into node params
// instead of the raw bytes.
export async function putBlob(file: Blob): Promise<string> {
    const ref = `${REF_PREFIX}${crypto.randomUUID()}`;
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(file, ref);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    return ref;
}

// object URLs are cached per ref for the life of the session — re-resolving
// the same ref (e.g. re-running the graph) never re-reads IndexedDB or
// creates a duplicate URL.
const objectUrlCache = new Map<string, string>();

// Synchronous, cache-only lookup: legacy strings resolve instantly, `idb:`
// refs resolve instantly only if already loaded once this session. Lets
// render-site hooks show a value on the very first render.
export function resolveMediaRefCached(ref: string | undefined): string | undefined {
    if (!ref) return undefined;
    if (!ref.startsWith(REF_PREFIX)) return ref;
    return objectUrlCache.get(ref);
}

// Turns a ref into a usable URL, reading from IndexedDB if not cached yet.
// A dangling ref (blob deleted, e.g. by the storage sweep) resolves to the
// ref string itself — an invalid src that just renders as a broken
// image/video, not a crash.
export async function resolveMediaRef(ref: string): Promise<string> {
    if (!ref.startsWith(REF_PREFIX)) return ref;
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

export async function listBlobIds(): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAllKeys();
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteBlobs(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (const id of ids) store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    for (const id of ids) {
        const url = objectUrlCache.get(id);
        if (url) {
            URL.revokeObjectURL(url);
            objectUrlCache.delete(id);
        }
    }
}

// Scans every given params object (node params, preset snapshots) for
// `idb:` refs — top-level string fields and string arrays — so the sweep
// below never deletes a blob still referenced anywhere. Generic rather than
// hardcoding `photos`/`coverUrl` by name, so it keeps working if another
// field starts using the same ref convention later.
export function collectLiveMediaRefs(...paramsLists: Record<string, unknown>[][]): Set<string> {
    const refs = new Set<string>();
    for (const list of paramsLists) {
        for (const params of list) {
            for (const value of Object.values(params)) {
                if (typeof value === "string" && value.startsWith(REF_PREFIX)) {
                    refs.add(value);
                } else if (Array.isArray(value)) {
                    for (const item of value) {
                        if (typeof item === "string" && item.startsWith(REF_PREFIX)) refs.add(item);
                    }
                }
            }
        }
    }
    return refs;
}

// Deletes every stored blob not present in `liveRefs`. Safe by construction
// (it deletes only what's absent from the full live set passed in), so it's
// exposed as a user-triggered action rather than run automatically on every
// param change.
export async function sweepUnusedBlobs(liveRefs: Set<string>): Promise<number> {
    const allIds = await listBlobIds();
    const unused = allIds.filter((id) => !liveRefs.has(id));
    await deleteBlobs(unused);
    return unused.length;
}
