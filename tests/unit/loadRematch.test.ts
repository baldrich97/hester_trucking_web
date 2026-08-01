import {afterEach, describe, expect, it} from "vitest";
import {TRPCError} from "@trpc/server";
import {
    assertCutoverLoadTypeAllowed,
    compareRates,
    resolveSourceIdForRematch,
    roundRate,
} from "../../src/server/loadRematch";

describe("loadRematch helpers", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
    });

    describe("compareRates", () => {
        it("matches rates within 2 decimal places", () => {
            expect(compareRates(10.005, 10.01)).toBe(true);
            expect(compareRates(10, 10.01)).toBe(false);
        });
    });

    describe("roundRate", () => {
        it("rounds to 2 decimals", () => {
            expect(roundRate(10.556)).toBe(10.56);
        });
    });

    describe("resolveSourceIdForRematch", () => {
        it("returns null when cutover inactive", () => {
            delete process.env.SOURCES_CUTOVER_FORCE;
            process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
            expect(resolveSourceIdForRematch(10001, 5)).toBeNull();
        });

        it("returns null for legacy load types when cutover active", () => {
            process.env.SOURCES_CUTOVER_FORCE = "true";
            expect(resolveSourceIdForRematch(116, 5)).toBeNull();
        });

        it("returns SourceID for new-era when cutover active", () => {
            process.env.SOURCES_CUTOVER_FORCE = "true";
            expect(resolveSourceIdForRematch(10001, 5)).toBe(5);
        });
    });

    describe("assertCutoverLoadTypeAllowed", () => {
        it("blocks new-era IDs before cutover", () => {
            delete process.env.SOURCES_CUTOVER_FORCE;
            process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
            expect(() => assertCutoverLoadTypeAllowed(10001)).toThrow(TRPCError);
        });

        it("allows new-era IDs when cutover active", () => {
            process.env.SOURCES_CUTOVER_FORCE = "true";
            expect(() => assertCutoverLoadTypeAllowed(10001)).not.toThrow();
        });
    });
});
