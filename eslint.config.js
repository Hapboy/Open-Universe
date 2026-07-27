import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
    // apps/api is a standalone Bun-run project with its own eslint.config.mjs
    // (kept out of the root npm workspaces on purpose — see package.json) so
    // it's excluded here entirely rather than linted twice under two rule sets.
    { ignores: ["**/dist/**", "**/.next/**", "apps/web/public/prototypes/**", "apps/api/**"] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
            "unused-imports": unusedImports,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-hooks/exhaustive-deps": "error",
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-unused-vars": "off",
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "warn",
                { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
        },
    },
);
