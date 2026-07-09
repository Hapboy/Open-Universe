export default {
    // Full project typecheck — tsc can't reliably check a single file out of
    // project context, so this ignores the staged filenames on purpose.
    "*.{ts,tsx}": () => "npx tsc --noEmit",

    "*.{ts,tsx,js}": (filenames) => [
        `npx eslint --fix ${filenames.join(" ")}`,
        `npx prettier --write ${filenames.join(" ")}`,
    ],

    "*.{css,json,md}": (filenames) => `npx prettier --write ${filenames.join(" ")}`,
};
