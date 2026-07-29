import type { CreateSceneInput, MediaAsset, Scene, UpdateSceneInput } from "./types";

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
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
    }

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
        upload: (file: Blob, filename?: string): Promise<MediaAsset> => {
            const form = new FormData();
            form.append("file", file, filename);
            return this.request<MediaAsset>("POST", "/media", { body: form });
        },
        list: (): Promise<MediaAsset[]> => this.request<MediaAsset[]>("GET", "/media"),
        get: (id: string): Promise<MediaAsset> => this.request<MediaAsset>("GET", `/media/${id}`),
        remove: (id: string): Promise<void> => this.request<void>("DELETE", `/media/${id}`),
    };
}
