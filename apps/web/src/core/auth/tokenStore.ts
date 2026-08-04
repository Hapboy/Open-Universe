// Plain sync accessors over the stored JWT - kept outside React state because
// hayverseApiClient's getAuthToken callback (see core/api/hayverse/client.ts)
// is called at request time, not render time, and needs to read the current
// value synchronously regardless of what's mounted.
import { readRaw, removeKey, writeRaw } from "../browserStorage.ts";

const TOKEN_KEY = "hv_jwt";

export function getToken(): string | null {
    return readRaw(TOKEN_KEY);
}

export function setToken(token: string): void {
    writeRaw(TOKEN_KEY, token);
}

export function clearToken(): void {
    removeKey(TOKEN_KEY);
}

// Decodes the stored JWT's `iat` claim without verifying the signature -
// display-only (AuthContext's Session.issuedAt), never used for anything
// security-sensitive; the backend is the only party that verifies the token.
export function getTokenIssuedAt(): number | null {
    const token = getToken();
    const payload = token?.split(".")[1];
    if (!payload) return null;
    try {
        const json: unknown = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
        const iat = (json as { iat?: unknown }).iat;
        return typeof iat === "number" ? iat * 1000 : null;
    } catch {
        return null;
    }
}
