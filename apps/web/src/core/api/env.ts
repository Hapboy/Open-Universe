// Whether each provider's real key is configured server-side (app/api/*/route.ts
// reads the actual key directly via process.env — never shipped to the browser).
// Only a plain boolean is safe to expose client-side, via the NEXT_PUBLIC_*_CONFIGURED
// build-time values next.config.ts derives from the real (server-only) env vars.
// Gemini isn't listed here anymore — its key lives in apps/api now, not on
// Vercel, so isProviderConfigured("gemini") would always report false. Its
// client (core/api/gemini/client.ts) always attempts the real call and
// branches on HTTP 501 instead.
export type ProviderName = "higgsfield" | "pinterest";

// Next.js only inlines `process.env.NEXT_PUBLIC_*` when the reference is static
// text — `process.env[name]` with a runtime variable is never replaced and always
// reads as undefined in the browser bundle. This map is the one place that has to
// spell each one out literally so the bundler can find and inline them;
// `isProviderConfigured` keeps its dynamic-by-name API for every call site.
const PROVIDER_CONFIGURED: Record<ProviderName, string | undefined> = {
    higgsfield: process.env.NEXT_PUBLIC_HIGGSFIELD_CONFIGURED,
    pinterest: process.env.NEXT_PUBLIC_PINTEREST_CONFIGURED,
};

export function isProviderConfigured(name: ProviderName): boolean {
    return PROVIDER_CONFIGURED[name] === "true";
}

export function getApiUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4175";
}

export function getR2PublicUrl(): string {
    return process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
}
