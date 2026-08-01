#!/usr/bin/env node
/**
 * Record or check test timing baselines.
 *
 * Usage:
 *   node scripts/collect-test-timings.mjs record   # run tests + save baseline
 *   node scripts/collect-test-timings.mjs check    # run tests + fail on regression
 */
import {execSync} from "child_process";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const reportsDir = path.join(root, "tests", "reports");
const baselinePath = path.join(root, "tests", "baselines", "timings.json");
const mode = process.argv[2] ?? "record";
const regressionFactor = Number(process.env.TEST_TIMING_REGRESSION_FACTOR ?? "1.5");
const minTestMs = Number(process.env.TEST_TIMING_MIN_MS ?? "50");

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
}

function run(cmd, env = {}) {
    console.log(`\n> ${cmd}`);
    execSync(cmd, {cwd: root, stdio: "inherit", env: {...process.env, ...env}});
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function vitestTimings() {
    const file = path.join(reportsDir, "vitest-results.json");
    if (!fs.existsSync(file)) return {suiteMs: 0, tests: {}};
    const data = readJson(file);
    const tests = {};
    let suiteMs = 0;
    for (const fileResult of data.testResults ?? []) {
        suiteMs += fileResult.endTime - fileResult.startTime;
        for (const assertion of fileResult.assertionResults ?? []) {
            const key = `${fileResult.name} › ${assertion.fullName}`;
            tests[key] = assertion.duration ?? 0;
        }
    }
    return {suiteMs, tests};
}

function playwrightTimings() {
    const file = path.join(reportsDir, "playwright-results.json");
    if (!fs.existsSync(file)) return {suiteMs: 0, tests: {}};
    const data = readJson(file);
    const tests = {};
    let suiteMs = 0;
    for (const suite of data.suites ?? []) {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                for (const result of test.results ?? []) {
                    const key = `${spec.title} › ${test.projectName}`;
                    const ms = result.duration ?? 0;
                    tests[key] = ms;
                    suiteMs += ms;
                }
            }
        }
    }
    return {suiteMs, tests};
}

ensureDir(reportsDir);
ensureDir(path.dirname(baselinePath));

run("npm test -- --reporter=default --reporter=json --outputFile=tests/reports/vitest-results.json");

const vitest = vitestTimings();
let playwright = {suiteMs: 0, tests: {}};

if (mode === "record" || process.env.TEST_TIMINGS_INCLUDE_E2E === "yes") {
    try {
        run("npm run test:e2e", {
            PLAYWRIGHT_SKIP_DB_CONFIRM: "yes",
            TEST_TIMINGS: "1",
        });
        playwright = playwrightTimings();
    } catch (err) {
        console.warn("E2E timing capture failed (dev server may be unavailable). Vitest timings still recorded.");
    }
}

const snapshot = {
    recordedAt: new Date().toISOString(),
    vitest: vitest,
    playwright: playwright,
};

if (mode === "record") {
    fs.writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2));
    console.log(`\nWrote baseline: ${baselinePath}`);
    process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
    console.error(`No baseline at ${baselinePath}. Run: npm run test:timings`);
    process.exit(1);
}

const baseline = readJson(baselinePath);
let failures = 0;

function checkSuite(label, current, base) {
    const limit = (base.suiteMs || 1) * regressionFactor;
    if (current.suiteMs > limit) {
        console.error(
            `${label} suite regressed: ${current.suiteMs}ms > ${Math.round(limit)}ms (baseline ${base.suiteMs}ms)`,
        );
        failures++;
    }
}

checkSuite("vitest", vitest, baseline.vitest ?? {suiteMs: 0});
if (playwright.suiteMs > 0) {
    checkSuite("playwright", playwright, baseline.playwright ?? {suiteMs: 0});
}

for (const [key, ms] of Object.entries(vitest.tests)) {
    const baseMs = baseline.vitest?.tests?.[key];
    if (baseMs && baseMs >= minTestMs && ms > baseMs * regressionFactor) {
        console.error(`vitest slow test: ${key} — ${ms}ms > ${Math.round(baseMs * regressionFactor)}ms`);
        failures++;
    }
}

for (const [key, ms] of Object.entries(playwright.tests)) {
    const baseMs = baseline.playwright?.tests?.[key];
    if (baseMs && baseMs >= minTestMs && ms > baseMs * regressionFactor) {
        console.error(`playwright slow test: ${key} — ${ms}ms > ${Math.round(baseMs * regressionFactor)}ms`);
        failures++;
    }
}

if (failures > 0) {
    console.error(`\n${failures} timing regression(s) detected.`);
    process.exit(1);
}

console.log("\nTiming check passed.");
process.exit(0);
