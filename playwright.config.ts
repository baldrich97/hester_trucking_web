import {defineConfig, devices} from "@playwright/test";
import path from "path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const authFile = path.join(__dirname, "tests/e2e/.auth/user.json");

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    workers: 1,
    timeout: 120000,
    reporter: process.env.TEST_TIMINGS
        ? [
              ["list"],
              ["json", {outputFile: path.join(__dirname, "tests/reports/playwright-results.json")}],
          ]
        : [["list"]],
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "setup",
            testMatch: /auth\.setup\.ts/,
        },
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                storageState: authFile,
            },
            dependencies: ["setup"],
            testIgnore: /auth\.setup\.ts/,
        },
    ],
    webServer: process.env.PLAYWRIGHT_SKIP_SERVER
        ? undefined
        : {
              command: "npm run dev",
              url: baseURL,
              reuseExistingServer: true,
              timeout: 120000,
              env: {
                  ...process.env,
                  SOURCES_CUTOVER_FORCE: "true",
                  NEXT_PUBLIC_SOURCES_CUTOVER_FORCE: "true",
              },
          },
    globalSetup: path.resolve(__dirname, "tests/e2e/global-setup.ts"),
    globalTeardown: path.resolve(__dirname, "tests/e2e/global-teardown.ts"),
});
