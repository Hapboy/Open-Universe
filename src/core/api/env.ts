// Single place to read/check the client-side API keys this app currently
// ships in the browser bundle — Next.js inlines every `NEXT_PUBLIC_*` env var
// at build time, so these are NOT server secrets: anyone can read them from
// devtools or the network tab today. Grep this file to find every provider
// affected; a later pass should move these calls behind a real server-side
// proxy (Route Handlers) instead of reading them here.
export type ClientSideKeyName =
    "NEXT_PUBLIC_GEMINI_KEY" | "NEXT_PUBLIC_HIGGSFIELD_KEY" | "NEXT_PUBLIC_PINTEREST_TOKEN";

// Next.js only inlines `process.env.NEXT_PUBLIC_*` when the reference is
// static text — `process.env[name]` with a runtime variable is never
// replaced and always reads as undefined in the browser bundle. This map is
// the one place that has to spell each key out literally so the bundler can
// find and inline them; `getClientSideKey` keeps its dynamic-by-name API for
// every call site.
const CLIENT_SIDE_KEYS: Record<ClientSideKeyName, string | undefined> = {
    NEXT_PUBLIC_GEMINI_KEY: process.env.NEXT_PUBLIC_GEMINI_KEY,
    NEXT_PUBLIC_HIGGSFIELD_KEY: process.env.NEXT_PUBLIC_HIGGSFIELD_KEY,
    NEXT_PUBLIC_PINTEREST_TOKEN: process.env.NEXT_PUBLIC_PINTEREST_TOKEN,
};

export function getClientSideKey(name: ClientSideKeyName): string {
    return CLIENT_SIDE_KEYS[name] ?? "";
}

export function hasClientSideKey(name: ClientSideKeyName): boolean {
    return getClientSideKey(name) !== "";
}
