import path from "path";
import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/unit/**/*.test.ts", "tests/routers/**/*.test.ts", "tests/components/**/*.test.tsx"],
        environmentMatchGlobs: [
            ["tests/components/**", "jsdom"],
        ],
        coverage: {
            provider: "v8",
            include: [
                "src/utils/**/*.ts",
                "src/utils/**/*.tsx",
                "src/config/**",
                "src/server/loadRematch.ts",
                "src/server/router/**/*.ts",
                "src/elements/**/*.tsx",
                "src/components/**/*.tsx",
            ],
            exclude: [
                "src/server/db/**",
                "src/server/common/**",
            ],
            // Floors sit slightly below measured coverage so regressions fail fast.
            thresholds: {
                lines: 40,
                functions: 35,
                branches: 40,
                statements: 40,
                "src/utils/**": {
                    lines: 30,
                    functions: 38,
                    branches: 55,
                    statements: 30,
                },
                "src/server/**": {
                    lines: 70,
                    functions: 72,
                    branches: 55,
                    statements: 70,
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "server/db/client": path.resolve(__dirname, "./src/server/db/client.ts"),
            "server": path.resolve(__dirname, "./src/server"),
            "elements": path.resolve(__dirname, "./src/elements"),
            "components": path.resolve(__dirname, "./src/components"),
            "utils": path.resolve(__dirname, "./src/utils"),
        },
    },
});
