import {describe, expect, it} from "vitest";
import {formatDateToWeek, getISOWeekNumber} from "../../src/utils/UtilityFunctions";

describe("UtilityFunctions", () => {
    it("formats ISO week string", () => {
        const week = formatDateToWeek(new Date("2024-01-15T12:00:00"));
        expect(week).toMatch(/^\d{4}-W\d{2}$/);
    });

    it("computes ISO week number", () => {
        expect(getISOWeekNumber(new Date("2024-01-01T12:00:00"))).toBeGreaterThan(0);
    });
});
