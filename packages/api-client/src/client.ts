import type {
    AiJob,
    AuthResponse,
    AuthUser,
    CreateSceneInput,
    GenerateImagenInput,
    GenerateImagenResult,
    GenerateLyriaInput,
    GenerateNanoBananaInput,
    GenerateTextInput,
    GenerateVeoInput,
    GenerateVisionInput,
    GeminiModelInfo,
    LoginInput,
    MediaAsset,
    MediaAssetKind,
    PinterestAuthorizeResponse,
    PinterestBoard,
    PinterestConnectionStatus,
    PinterestPin,
    Preset,
    Scene,
    SignupInput,
    UpdateSceneInput,
    UpsertPresetInput,
} from "./types";

export interface ApiClientOptions {
    baseUrl: string;
    // Injectable for environments without a global fetch (older Node) or for
    // tests that want to stub network calls.
    fetch?: typeof fetch;
    getAuthToken?: () => string | null | undefined;
}

export class ApiError extends Error {
    readonly status: number;
    readonly method: string;
    readonly path: string;
    readonly body: string;

    constructor(status: number, method: string, path: string, body: string) {
        super(`${method} ${path} failed: ${status} ${body}`);
        this.name = "ApiError";
        this.status = status;
        this.method = method;
        this.path = path;
        this.body = body;
    }
}

export class HayverseApiClient {
    private readonly baseUrl: string;
    private readonly fetchImpl: typeof fetch;
    private readonly getAuthToken?: () => string | null | undefined;

    constructor(options: ApiClientOptions) {
        this.baseUrl = options.baseUrl.replace(/\/$/, "");
        // Native fetch isn't a proper method - it throws "Illegal invocation"
        // if called with a receiver other than the global object (e.g. via
        // `this.fetchImpl(...)` once stored on a class instance). Binding it
        // to globalThis here means callers can pass a plain `fetch` without
        // knowing about this quirk.
        this.fetchImpl = options.fetch ?? fetch.bind(globalThis);
        this.getAuthToken = options.getAuthToken;
    }

    private async request<T>(
        method: string,
        path: string,
        init?: { body?: BodyInit; json?: unknown },
    ): Promise<T> {
        const headers = new Headers();
        const token = this.getAuthToken?.();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        let body: BodyInit | undefined;
        if (init?.json !== undefined) {
            headers.set("Content-Type", "application/json");
            body = JSON.stringify(init.json);
        } else {
            body = init?.body;
        }

        const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method,
            headers,
            body,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new ApiError(res.status, method, path, text);
        }
        // Not just 204: NestJS sends 200 with an empty body for handlers
        // that return void/undefined too (e.g. every `remove` endpoint)
        // unless the controller opts into @HttpCode(204) explicitly - so
        // an empty body has to be handled regardless of status code, or
        // res.json() throws on the empty string and every caller's delete
        // looks like it failed even though it went through.
        const text = await res.text();
        return (text ? JSON.parse(text) : undefined) as T;
    }

    readonly auth = {
        signup: (input: SignupInput): Promise<AuthResponse> =>
            this.request<AuthResponse>("POST", "/auth/signup", { json: input }),
        login: (input: LoginInput): Promise<AuthResponse> =>
            this.request<AuthResponse>("POST", "/auth/login", { json: input }),
        logout: (): Promise<void> => this.request<void>("POST", "/auth/logout"),
        me: (): Promise<{ user: AuthUser }> => this.request<{ user: AuthUser }>("GET", "/auth/me"),
    };

    readonly pinterest = {
        getConnectionStatus: (): Promise<PinterestConnectionStatus> =>
            this.request<PinterestConnectionStatus>("GET", "/pinterest/connection"),
        getAuthorizeUrl: (): Promise<PinterestAuthorizeResponse> =>
            this.request<PinterestAuthorizeResponse>("GET", "/pinterest/oauth/authorize"),
        disconnect: (): Promise<void> => this.request<void>("DELETE", "/pinterest/connection"),
        listBoards: (): Promise<{ boards: PinterestBoard[] }> =>
            this.request<{ boards: PinterestBoard[] }>("GET", "/pinterest/boards"),
        listPins: (boardId: string): Promise<{ pins: PinterestPin[] }> =>
            this.request<{ pins: PinterestPin[] }>(
                "GET",
                `/pinterest/boards/${encodeURIComponent(boardId)}/pins`,
            ),
    };

    readonly scenes = {
        create: (input: CreateSceneInput): Promise<Scene> =>
            this.request<Scene>("POST", "/scenes", { json: input }),
        list: (): Promise<Scene[]> => this.request<Scene[]>("GET", "/scenes"),
        get: (id: string): Promise<Scene> => this.request<Scene>("GET", `/scenes/${id}`),
        update: (id: string, input: UpdateSceneInput): Promise<Scene> =>
            this.request<Scene>("PATCH", `/scenes/${id}`, { json: input }),
        remove: (id: string): Promise<void> => this.request<void>("DELETE", `/scenes/${id}`),
    };

    readonly media = {
        upload: (file: Blob, filename?: string, kind?: MediaAssetKind): Promise<MediaAsset> => {
            const form = new FormData();
            form.append("file", file, filename);
            if (kind) form.append("kind", kind);
            return this.request<MediaAsset>("POST", "/media", { body: form });
        },
        list: (): Promise<MediaAsset[]> => this.request<MediaAsset[]>("GET", "/media"),
        get: (id: string): Promise<MediaAsset> => this.request<MediaAsset>("GET", `/media/${id}`),
        remove: (id: string): Promise<void> => this.request<void>("DELETE", `/media/${id}`),
    };

    readonly presets = {
        list: (entityType?: string): Promise<Preset[]> =>
            this.request<Preset[]>(
                "GET",
                entityType ? `/presets?entityType=${encodeURIComponent(entityType)}` : "/presets",
            ),
        // POST /presets upserts when input.id is set - see UpsertPresetInput.
        upsert: (input: UpsertPresetInput): Promise<Preset> =>
            this.request<Preset>("POST", "/presets", { json: input }),
        remove: (id: string): Promise<void> => this.request<void>("DELETE", `/presets/${id}`),
    };

    readonly jobs = {
        get: (id: string): Promise<AiJob> => this.request<AiJob>("GET", `/ai/jobs/${id}`),
    };

    // Thin pass-through to apps/api's Gemini routes - no toasts, no mock
    // fallback, no browser-only base64 conversion. That orchestration lives
    // in apps/web's own adapter (core/api/gemini/client.ts), which catches
    // ApiError and branches on status === 501 (not configured) vs. anything
    // else.
    readonly gemini = {
        listModels: (): Promise<{ models: GeminiModelInfo[] }> =>
            this.request<{ models: GeminiModelInfo[] }>("GET", "/ai/gemini/models"),
        generateText: (input: GenerateTextInput): Promise<{ text: string | null }> =>
            this.request<{ text: string | null }>("POST", "/ai/gemini/text", { json: input }),
        generateVision: (input: GenerateVisionInput): Promise<{ text: string | null }> =>
            this.request<{ text: string | null }>("POST", "/ai/gemini/vision", { json: input }),
        generateImagen: (input: GenerateImagenInput): Promise<GenerateImagenResult> =>
            this.request<GenerateImagenResult>("POST", "/ai/gemini/imagen", { json: input }),
        // 202 - `request()` accepts any 2xx as ok, no special-casing needed.
        generateVeo: (input: GenerateVeoInput): Promise<{ jobId: string }> =>
            this.request<{ jobId: string }>("POST", "/ai/gemini/veo", { json: input }),
        // `dataUrls` holds every image the model returned; `dataUrl` (the
        // first one) stays for the deploy window where apps/api hasn't been
        // `railway up`'d yet — see GeminiController.nanoBanana.
        generateNanoBanana: (
            input: GenerateNanoBananaInput,
        ): Promise<{ dataUrl: string; dataUrls?: string[] }> =>
            this.request<{ dataUrl: string; dataUrls?: string[] }>(
                "POST",
                "/ai/gemini/nano-banana",
                { json: input },
            ),
        generateLyria: (input: GenerateLyriaInput): Promise<{ dataUrl: string }> =>
            this.request<{ dataUrl: string }>("POST", "/ai/gemini/lyria", { json: input }),
    };
}
