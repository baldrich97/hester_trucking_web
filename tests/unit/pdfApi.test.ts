import {describe, expect, it} from "vitest";

/**
 * Daily partial PDF route encodes sheet|week|type in the query ID segment.
 * @see src/pages/api/getPDF/daily/[ID].js
 */
export function parseDailyPdfId(id: string): {sheet: string; week: string; type: string} {
    const [sheet, week, type] = id.split("|");
    return {sheet: sheet ?? "", week: week ?? "", type: type ?? ""};
}

describe("getPDF daily ID parsing", () => {
    it("parses full daily sheet ID", () => {
        expect(parseDailyPdfId("42|2026-W30|full")).toEqual({
            sheet: "42",
            week: "2026-W30",
            type: "full",
        });
    });

    it("parses partial daily sheet ID for LastPrinted filter", () => {
        const parsed = parseDailyPdfId("42|2026-W30|partial");
        expect(parsed.type).toBe("partial");
        expect(parsed.sheet).toBe("42");
    });

    it("handles missing segments gracefully", () => {
        expect(parseDailyPdfId("42")).toEqual({
            sheet: "42",
            week: "",
            type: "",
        });
    });
});
