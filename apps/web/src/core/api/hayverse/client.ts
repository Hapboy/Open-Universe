// Typed client for apps/api (see docs/DECISIONS.md's "Inter-service client
// packages" entry) — unlike the gemini/higgsfield/pinterest adapters in
// sibling folders, this isn't a hand-rolled fetch wrapper: @hayverse/api-client
// is a published package apps/api's own Swagger surface is meant to grow
// alongside, so call sites depend on its typed methods directly.
import { HayverseApiClient } from "@hayverse/api-client";
import { getApiUrl } from "@/core/api/env.ts";
import { getToken } from "@/core/auth/tokenStore.ts";

export const hayverseApiClient = new HayverseApiClient({
    baseUrl: getApiUrl(),
    getAuthToken: getToken,
});
