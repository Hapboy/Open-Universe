export default {
    // Full project typecheck — tsc can't reliably check a single file out of
    // project context, so this ignores the staged filenames on purpose. Runs
    // per-workspace since there's no longer a single root tsconfig.json.
    "*.{ts,tsx}": () => "npm run typecheck --workspaces --if-present",

    "*.{ts,tsx,js}": (filenames) => [
        `npx eslint --fix ${filenames.join(" ")}`,
        `npx prettier --write ${filenames.join(" ")}`,
    ],

    "*.{css,json,md}": (filenames) => `npx prettier --write ${filenames.join(" ")}`,
};
