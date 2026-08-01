import {describe, expect, it} from "vitest";
import {
    dateOnlyLocalToUtcNoon,
    parseDateOnlyFromJson,
    wireDateToUtcNoon,
} from "../../src/utils/dateOnly";

describe("dateOnly", () => {
    it("parses YYYY-MM-DD to UTC noon", () => {
        const d = parseDateOnlyFromJson("2024-06-15");
        expect(d?.getUTCHours()).toBe(12);
        expect(d?.getUTCDate()).toBe(15);
    });

    it("converts local date picker value to UTC noon", () => {
        const local = new Date(2024, 5, 15);
        const d = dateOnlyLocalToUtcNoon(local);
        expect(d?.getUTCFullYear()).toBe(2024);
        expect(d?.getUTCMonth()).toBe(5);
        expect(d?.getUTCDate()).toBe(15);
    });

    it("normalizes wire dates to UTC noon", () => {
        const d = wireDateToUtcNoon(new Date(Date.UTC(2024, 0, 2, 0, 0, 0)));
        expect(d?.getUTCHours()).toBe(12);
        expect(d?.getUTCDate()).toBe(2);
    });
});
