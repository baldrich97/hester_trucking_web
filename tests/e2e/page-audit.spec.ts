import {expect, test, type Page} from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Performance / payload audit for every route.
 *
 * Each route gets a warm-up visit (so Next dev-server compilation does not skew
 * numbers), then a measured visit that records TTFB, DOMContentLoaded, time to
 * visible <main>, document + __NEXT_DATA__ payload sizes, and every tRPC call
 * fired during initial load. Results land in tests/reports/page-audit.{json,md}.
 *
 * Run standalone with `npm run audit:pages`.
 */

const ROUTES = [
    "/",
    "/loads",
    "/loads/massedit",
    "/invoices",
    "/invoices/overdue",
    "/dailies",
    "/dailies/w2",
    "/dailies/operator",
    "/dailies/not_printed",
    "/weeklies",
    "/weeklies/not_printed",
    "/paystubs",
    "/reports",
    "/reports/customers",
    "/sources",
    "/customers",
    "/drivers",
    "/drivers/w2_forms",
    "/drivers/owner_forms",
    "/drivers/form-options",
    "/drivers/expiring-soon",
    "/trucks",
    "/carriers",
    "/carriers/compliance",
    "/deliverylocations",
    "/loadtypes",
];

/** How long to keep listening for tRPC traffic after <main> is visible. */
const TRPC_SETTLE_MS = 1200;

type TrpcCall = {
    /** tRPC procedure path(s), e.g. "loads.getAllPage". */
    procedure: string;
    ms: number;
    bytes: number;
};

type RouteAudit = {
    route: string;
    status: number;
    ttfbMs: number;
    domContentLoadedMs: number;
    mainVisibleMs: number;
    documentBytes: number;
    nextDataBytes: number;
    trpcCalls: TrpcCall[];
    trpcTotalMs: number;
    trpcTotalBytes: number;
};

const results: RouteAudit[] = [];

function trpcProcedureFromUrl(url: string): string {
    const match = /\/api\/trpc\/([^?]+)/.exec(url);
    return match?.[1] ? decodeURIComponent(match[1]) : url;
}

async function auditRoute(page: Page, route: string): Promise<RouteAudit> {
    // Warm-up pass: compile the route + prime caches, then reset.
    await page.goto(route, {waitUntil: "domcontentloaded"});
    await page.waitForTimeout(300);
    await page.goto("about:blank");

    const trpcCalls: TrpcCall[] = [];
    const pending: Promise<void>[] = [];
    const listener = (response: import("@playwright/test").Response) => {
        if (!response.url().includes("/api/trpc/")) return;
        pending.push(
            (async () => {
                // timing() is only fully populated once the request finishes.
                await response.finished();
                const timing = response.request().timing();
                const ms = timing.responseEnd > 0 ? Math.round(timing.responseEnd) : 0;
                let bytes = Number(response.headers()["content-length"] ?? 0);
                if (!bytes) {
                    try {
                        bytes = (await response.body()).length;
                    } catch {
                        bytes = 0;
                    }
                }
                trpcCalls.push({procedure: trpcProcedureFromUrl(response.url()), ms, bytes});
            })().catch(() => undefined),
        );
    };
    page.on("response", listener);

    const start = Date.now();
    const response = await page.goto(route, {waitUntil: "domcontentloaded"});
    await expect(page.locator("main")).toBeVisible({timeout: 30000});
    const mainVisibleMs = Date.now() - start;

    // Let initial data queries land before we stop counting.
    await page.waitForTimeout(TRPC_SETTLE_MS);
    page.off("response", listener);
    await Promise.all(pending);

    let documentBytes = 0;
    try {
        documentBytes = response ? (await response.body()).length : 0;
    } catch {
        documentBytes = 0;
    }

    const nav = await page.evaluate(() => {
        const entry = performance.getEntriesByType("navigation")[0] as
            | PerformanceNavigationTiming
            | undefined;
        return entry
            ? {
                  ttfb: Math.round(entry.responseStart),
                  domContentLoaded: Math.round(entry.domContentLoadedEventEnd),
              }
            : {ttfb: 0, domContentLoaded: 0};
    });

    const nextDataBytes = await page.evaluate(
        () => document.getElementById("__NEXT_DATA__")?.textContent?.length ?? 0,
    );

    return {
        route,
        status: response?.status() ?? 0,
        ttfbMs: nav.ttfb,
        domContentLoadedMs: nav.domContentLoaded,
        mainVisibleMs,
        documentBytes,
        nextDataBytes,
        trpcCalls,
        trpcTotalMs: trpcCalls.reduce((sum, c) => sum + c.ms, 0),
        trpcTotalBytes: trpcCalls.reduce((sum, c) => sum + c.bytes, 0),
    };
}

for (const route of ROUTES) {
    test(`audit ${route}`, async ({page}) => {
        const audit = await auditRoute(page, route);
        expect(audit.status).toBeLessThan(500);
        results.push(audit);
    });
}

function kb(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`;
}

test.afterAll(() => {
    if (results.length === 0) return;

    const reportsDir = path.resolve(__dirname, "../reports");
    fs.mkdirSync(reportsDir, {recursive: true});

    fs.writeFileSync(
        path.join(reportsDir, "page-audit.json"),
        JSON.stringify({generatedAt: new Date().toISOString(), results}, null, 2),
    );

    const byMainVisible = [...results].sort((a, b) => b.mainVisibleMs - a.mainVisibleMs);
    const byPayload = [...results].sort(
        (a, b) => b.nextDataBytes + b.trpcTotalBytes - (a.nextDataBytes + a.trpcTotalBytes),
    );

    // Aggregate tRPC procedures across all routes. Batched HTTP calls carry
    // several procedures; split time/bytes evenly so totals stay honest.
    const procTotals = new Map<string, {calls: number; ms: number; bytes: number}>();
    for (const r of results) {
        for (const c of r.trpcCalls) {
            const procs = c.procedure.split(",");
            for (const proc of procs) {
                const agg = procTotals.get(proc) ?? {calls: 0, ms: 0, bytes: 0};
                agg.calls += 1;
                agg.ms += c.ms / procs.length;
                agg.bytes += c.bytes / procs.length;
                procTotals.set(proc, agg);
            }
        }
    }
    const topProcs = [...procTotals.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, 15);

    const lines: string[] = [
        "# Page audit",
        "",
        `Generated: ${new Date().toISOString()}`,
        "",
        "Timings come from the local **dev server** (after a warm-up visit per route), so absolute",
        "numbers are inflated versus production — compare routes against each other, and re-run after",
        "changes to spot regressions. `Payload` = SSR \\_\\_NEXT_DATA\\_\\_ + tRPC response bytes.",
        "",
        "## Routes by time to visible content",
        "",
        "| Route | Main visible | TTFB | DOMContentLoaded | Doc | __NEXT_DATA__ | tRPC calls | tRPC time | tRPC bytes |",
        "|-------|-------------:|-----:|-----------------:|----:|--------------:|-----------:|----------:|-----------:|",
        ...byMainVisible.map(
            (r) =>
                `| ${r.route} | ${r.mainVisibleMs} ms | ${r.ttfbMs} ms | ${r.domContentLoadedMs} ms | ${kb(r.documentBytes)} | ${kb(r.nextDataBytes)} | ${r.trpcCalls.length} | ${r.trpcTotalMs} ms | ${kb(r.trpcTotalBytes)} |`,
        ),
        "",
        "## Routes by data payload",
        "",
        "| Route | Payload | __NEXT_DATA__ | tRPC bytes |",
        "|-------|--------:|--------------:|-----------:|",
        ...byPayload
            .slice(0, 10)
            .map(
                (r) =>
                    `| ${r.route} | ${kb(r.nextDataBytes + r.trpcTotalBytes)} | ${kb(r.nextDataBytes)} | ${kb(r.trpcTotalBytes)} |`,
            ),
        "",
        "## Slowest tRPC procedures (all routes combined)",
        "",
        "| Procedure | Calls | Total time | Total bytes |",
        "|-----------|------:|-----------:|------------:|",
        ...topProcs.map(
            ([proc, agg]) =>
                `| ${proc} | ${agg.calls} | ${Math.round(agg.ms)} ms | ${kb(agg.bytes)} |`,
        ),
        "",
    ];

    fs.writeFileSync(path.join(reportsDir, "page-audit.md"), lines.join("\n"));

    const slowest = byMainVisible[0];
    console.log(
        `[page-audit] ${results.length} routes audited. Slowest: ${slowest?.route} (${slowest?.mainVisibleMs} ms). ` +
            `Report: tests/reports/page-audit.md`,
    );
});
