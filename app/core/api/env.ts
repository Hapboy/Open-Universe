// Single place to read/check the client-side API keys this app currently
// ships in the browser bundle — Vite inlines every `VITE_*` env var at build
// time, so these are NOT server secrets: anyone can read them from devtools
// or the network tab today. Grep this file to find every provider affected;
// the future Next.js pass should move these calls behind a real server-side
// proxy instead of reading them here.
export type ClientSideKeyName = "VITE_GEMINI_KEY" | "VITE_HIGGSFIELD_KEY" | "VITE_PINTEREST_TOKEN";

export function getClientSideKey(name: ClientSideKeyName): string {
    return (import.meta.env[name] as string) ?? "";
}

export function hasClientSideKey(name: ClientSideKeyName): boolean {
    return getClientSideKey(name) !== "";
}
