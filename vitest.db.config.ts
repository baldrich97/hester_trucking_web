import path from "path";
import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./tests/setup.ts", "./tests/setup.db.ts"],
        include: ["tests/db/**/*.test.ts"],
        testTimeout: 120000,
        hookTimeout: 180000,
        fileParallelism: false,
        globalSetup: ["./tests/db/global-setup.ts"],
    },
    esbuild: {
        jsx: "automatic",
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "server/db/client": path.resolve(__dirname, "./src/server/db/client.ts"),
            "server": path.resolve(__dirname, "./src/server"),
        },
    },
});
