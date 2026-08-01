import {describe, expect, it} from "vitest";
import {
    formatPaginatedPageLabel,
    getPaginatedLastPage,
    parseGrabCount,
} from "../../src/utils/paginatedSheet";

describe("paginatedSheet utils", () => {
    it("computes last page with ceil (15 items => 2 pages)", () => {
        expect(getPaginatedLastPage(15)).toBe(2);
        expect(getPaginatedLastPage(10)).toBe(1);
        expect(getPaginatedLastPage(11)).toBe(2);
        expect(getPaginatedLastPage(25)).toBe(3);
    });

    it("returns page 1 when count is zero", () => {
        expect(getPaginatedLastPage(0)).toBe(1);
    });

    it("parses grab count from warnings", () => {
        expect(parseGrabCount(["25"])).toBe(25);
        expect(parseGrabCount(undefined)).toBe(0);
    });

    it("formats page label", () => {
        expect(formatPaginatedPageLabel(2, 25)).toBe("Page 2 of 3");
        expect(formatPaginatedPageLabel(1, 0)).toBe("Page 1");
    });
});
