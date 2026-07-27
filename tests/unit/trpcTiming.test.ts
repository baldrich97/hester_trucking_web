import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
    clearTrpcTimings,
    recentTrpcTimings,
    recordTrpcTiming,
    timingEnabled,
} from "../../src/server/router/timing";
import {callTrpcQuery, createTestContext} from "../helpers/trpcCaller";

describe("trpc timing instrumentation", () => {
    beforeEach(() => {
        clearTrpcTimings();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        delete process.env.TRPC_SLOW_MS;
        delete process.env.TRPC_TIMING;
        clearTrpcTimings();
    });

    it("is enabled outside production and can be switched off", () => {
        expect(timingEnabled()).toBe(true); // vitest runs with NODE_ENV=test
        process.env.TRPC_TIMING = "off";
        expect(timingEnabled()).toBe(false);
    });

    it("logs calls at or above the slow threshold and skips fast ones", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        process.env.TRPC_SLOW_MS = "100";

        recordTrpcTiming({path: "fast.call", type: "query", durationMs: 50, ok: true, at: 0});
        expect(warn).not.toHaveBeenCalled();

        recordTrpcTiming({path: "slow.call", type: "query", durationMs: 150, ok: true, at: 0});
        expect(warn).toHaveBeenCalledWith("[trpc slow] query slow.call 150ms");

        recordTrpcTiming({path: "bad.call", type: "mutation", durationMs: 200, ok: false, at: 0});
        expect(warn).toHaveBeenCalledWith("[trpc slow] mutation bad.call 200ms (error)");
    });

    it("keeps at most 500 samples (ring buffer)", () => {
        process.env.TRPC_SLOW_MS = "999999";
        for (let i = 0; i < 510; i++) {
            recordTrpcTiming({path: `p${i}`, type: "query", durationMs: 1, ok: true, at: i});
        }
        const samples = recentTrpcTimings();
        expect(samples).toHaveLength(500);
        expect(samples[0]!.path).toBe("p10");
        expect(samples[499]!.path).toBe("p509");
    });

    it("records exactly one sample per procedure call through the app router", async () => {
        process.env.TRPC_SLOW_MS = "999999"; // keep the console quiet
        const prismaMock = {
            states: {
                findMany: vi.fn(async () => [{ID: 1, Name: "Oklahoma", Abbreviation: "OK"}]),
            },
        };
        const ctx = await createTestContext(prismaMock);

        await callTrpcQuery("states.getAll", undefined, ctx);

        const samples = recentTrpcTimings().filter((s) => s.path === "states.getAll");
        expect(samples).toHaveLength(1);
        expect(samples[0]!.type).toBe("query");
        expect(samples[0]!.ok).toBe(true);
        expect(samples[0]!.durationMs).toBeGreaterThanOrEqual(0);
    });
});
