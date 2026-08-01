import {describe, expect, it} from "vitest";
import {
    formatDriverDisplayName,
    formatTruckDisplayName,
} from "../../src/utils/entityDisplay";

describe("entityDisplay", () => {
    it("formats driver name", () => {
        expect(formatDriverDisplayName({FirstName: "John", LastName: "Doe"})).toBe("John Doe");
    });

    it("marks inactive drivers", () => {
        expect(formatDriverDisplayName({FirstName: "A", LastName: "B", Active: false})).toBe(
            "A B - INACTIVE",
        );
    });

    it("formats truck name", () => {
        expect(formatTruckDisplayName({Name: "Truck 12"})).toBe("Truck 12");
    });

    it("returns N/A for null", () => {
        expect(formatDriverDisplayName(null)).toBe("N/A");
        expect(formatTruckDisplayName(undefined)).toBe("N/A");
    });
});
