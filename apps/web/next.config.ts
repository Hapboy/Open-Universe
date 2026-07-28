import { execSync } from "node:child_process";
import type { NextConfig } from "next";

function getGitHash(): string {
    try {
        return execSync("git rev-parse --short HEAD").toString().trim();
    } catch {
        return "unknown";
    }
}

const nextConfig: NextConfig = {
    transpilePackages: ["@hayverse/shared"],
    env: {
        NEXT_PUBLIC_GIT_HASH: getGitHash(),
        // Whether each provider's real (server-only) key is configured — safe to
        // expose as a plain boolean, unlike the key itself. Read by StatusBar and
        // the api/*/client.ts adapters' mock-fallback gate. Baked in at build
        // time, same as NEXT_PUBLIC_GIT_HASH above: changing .env.local needs a
        // rebuild/dev-server-restart to take effect.
        NEXT_PUBLIC_GEMINI_CONFIGURED: String(!!process.env.GEMINI_KEY),
        NEXT_PUBLIC_HIGGSFIELD_CONFIGURED: String(!!process.env.HIGGSFIELD_KEY),
        NEXT_PUBLIC_PINTEREST_CONFIGURED: String(!!process.env.PINTEREST_TOKEN),
    },
};

export default nextConfig;
