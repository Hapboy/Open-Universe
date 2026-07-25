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
    env: {
        NEXT_PUBLIC_GIT_HASH: getGitHash(),
    },
};

export default nextConfig;
