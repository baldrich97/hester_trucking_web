import {describe, expect, it} from "vitest";
import {entityNavHref, hrefHasInvalidId, parseRouteId} from "../../src/utils/parseRouteId";

describe("parseRouteId", () => {
    it("accepts positive integer strings", () => {
        expect(parseRouteId("71714")).toBe(71714);
    });

    it("rejects values Prisma would treat as a missing ID", () => {
        expect(parseRouteId("undefined")).toBeNull();
        expect(parseRouteId("NaN")).toBeNull();
        expect(parseRouteId("new")).toBeNull();
        expect(parseRouteId("")).toBeNull();
        expect(parseRouteId(undefined)).toBeNull();
        expect(parseRouteId(NaN)).toBeNull();
        expect(parseRouteId("123abc")).toBeNull();
        expect(parseRouteId("0")).toBeNull();
        expect(parseRouteId("-1")).toBeNull();
    });
});

describe("entityNavHref", () => {
    it("appends an id to a prefix", () => {
        expect(entityNavHref("/loads/", 44)).toBe("/loads/44");
    });

    it("replaces [ID] placeholders", () => {
        expect(entityNavHref("customers/[ID]", 9)).toBe("customers/9");
    });

    it("returns null when the id is not numeric", () => {
        expect(entityNavHref("/loads/", undefined)).toBeNull();
        expect(entityNavHref("customers/[ID]", "undefined")).toBeNull();
    });
});

describe("hrefHasInvalidId", () => {
    it("detects interpolated undefined/NaN ids", () => {
        expect(hrefHasInvalidId("/loads/undefined")).toBe(true);
        expect(hrefHasInvalidId("/loads/NaN?tab=forms")).toBe(true);
        expect(hrefHasInvalidId("/loads/71714")).toBe(false);
    });
});
