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
