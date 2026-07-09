import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function getGitHash(): string {
    try {
        return execSync("git rev-parse --short HEAD").toString().trim();
    } catch {
        return "unknown";
    }
}

export default defineConfig({
    root: "app",
    envDir: "..", // .env.local lives at repo root, not inside app/
    build: { outDir: "../dist", emptyOutDir: true },
    plugins: [react()],
    server: { port: 4174 },
    define: { __GIT_HASH__: JSON.stringify(getGitHash()) },
});
