export interface Scene {
    id: string;
    ownerId: string | null;
    title: string;
    graph: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSceneInput {
    title: string;
    graph?: Record<string, unknown>;
    ownerId?: string;
}

export type UpdateSceneInput = Partial<CreateSceneInput>;

export type MediaAssetKind = "uploaded" | "generated";

export interface MediaAsset {
    id: string;
    ownerId: string | null;
    kind: MediaAssetKind;
    storageKey: string;
    mimeType: string;
    sizeBytes: string;
    createdAt: string;
    url: string;
}

export interface Preset {
    id: string;
    entityType: string;
    ownerId: string | null;
    name: string;
    snapshot: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface UpsertPresetInput {
    // Client-minted id - pass the node's own presetId to update that row in
    // place (or create it under that id if it doesn't exist yet) instead of
    // getting back a backend-generated id the caller would then have to
    // reconcile against. Omit to let the backend mint one.
    id?: string;
    entityType: string;
    name: string;
    snapshot: Record<string, unknown>;
    ownerId?: string;
}
