// apps/api's TeamRole - kept as a plain string union here rather than
// importing @hayverse/shared, matching how the rest of this file avoids
// depending on domain enums it doesn't otherwise need.
export type AuthUserRole = "Режиссер" | "Разработчик" | "Художник" | "Стилист";

export interface AuthUser {
    id: string;
    username: string;
    firstName: string;
    lastName: string | null;
    role: AuthUserRole;
}

export interface SignupInput {
    username: string;
    password: string;
    firstName: string;
    lastName?: string;
}

export interface LoginInput {
    username: string;
    password: string;
}

export interface AuthResponse {
    user: AuthUser;
    token: string;
}

export interface PinterestBoard {
    id: string;
    name: string;
}

export interface PinterestPin {
    id: string;
    title: string;
    image: string;
}

export interface PinterestConnectionStatus {
    connected: boolean;
    pinterestUsername?: string;
}

export interface PinterestAuthorizeResponse {
    url: string;
}

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

// Mirrors HIGGSFIELD_JOB_STATUSES (packages/shared) - reused across every AI
// provider's async jobs, not just Higgsfield's.
export type AiJobStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw";

export interface AiJob {
    id: string;
    ownerId: string | null;
    provider: string;
    kind: string;
    status: AiJobStatus;
    result: Record<string, unknown> | null;
    error: string | null;
    createdAt: string;
    updatedAt: string;
}

// apps/api/src/ai-gateway/gemini - a thin pass-through to Gemini's Developer
// API, so these mirror its dto/*.dto.ts shapes 1:1 rather than inventing a
// client-side convenience shape. `options` stays an untyped Record on the
// wire (same tradeoff as Preset.snapshot) - callers own the concrete option
// fields for whichever model they're calling.
export interface GeminiModelInfo {
    id: string;
    displayName?: string;
}

export interface GenerateTextInput {
    prompt: string;
    model?: string;
}

export interface GenerateVisionInput {
    imageBase64: string;
    query: string;
    model?: string;
}

export interface GenerateImagenInput {
    prompt: string;
    options: Record<string, unknown>;
}

export type GenerateImagenResult = { ok: true; dataUrl: string } | { ok: false; reason?: string };

export interface GenerateVeoInput {
    prompt: string;
    imageBase64?: string | null;
    options: Record<string, unknown>;
}

export interface GenerateNanoBananaInput {
    prompt: string;
    imageBase64List: string[];
    options: Record<string, unknown>;
}

export interface GenerateLyriaInput {
    prompt: string;
    options: Record<string, unknown>;
}
