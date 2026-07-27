import {afterEach, describe, expect, it} from "vitest";
import {
    getSourcesCutoverDate,
    isNewEraLoadTypeId,
    isSourcesCutoverActive,
    NEW_LOAD_TYPE_ID_THRESHOLD,
    SOURCES_CUTOVER_DATE_DEFAULT,
} from "../../src/config/sourcesCutover";

describe("sourcesCutover", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
    });

    it("default cutover date is Aug 2 2026", () => {
        expect(SOURCES_CUTOVER_DATE_DEFAULT).toContain("2026-08-02");
    });

    it("is inactive before cutover when no force flag", () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        const before = new Date("2026-07-01T12:00:00-05:00");
        expect(isSourcesCutoverActive(before)).toBe(false);
    });

    it("is active on or after cutover date", () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        const onDay = new Date("2026-08-02T12:00:00-05:00");
        expect(isSourcesCutoverActive(onDay)).toBe(true);
    });

    it("SOURCES_CUTOVER_FORCE enables cutover immediately", () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const before = new Date("2020-01-01");
        expect(isSourcesCutoverActive(before)).toBe(true);
    });

    it("respects SOURCES_CUTOVER_DATE override", () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2025-06-01T00:00:00-05:00";
        expect(isSourcesCutoverActive(new Date("2025-07-01"))).toBe(true);
        expect(isSourcesCutoverActive(new Date("2025-05-01"))).toBe(false);
    });

    it("new era load types are ID >= threshold", () => {
        expect(NEW_LOAD_TYPE_ID_THRESHOLD).toBe(10000);
        expect(isNewEraLoadTypeId(9999)).toBe(false);
        expect(isNewEraLoadTypeId(10000)).toBe(true);
        expect(isNewEraLoadTypeId(null)).toBe(false);
    });
});
