import {describe, expect, it} from "vitest";
import {formatMaterial, formatMaterialFromLoad} from "../../src/utils/formatMaterial";

describe("formatMaterial", () => {
    it("returns description when no source", () => {
        expect(formatMaterial({description: "ASPHALT", source: null})).toBe("ASPHALT");
    });

    it("appends ShortName when present", () => {
        expect(
            formatMaterial({
                description: "ASPHALT",
                source: {Name: "Fruitland", ShortName: "FRUIT"},
            }),
        ).toBe("ASPHALT (FRUIT)");
    });

    it("falls back to Name when ShortName empty", () => {
        expect(
            formatMaterial({
                description: "AGLIME",
                source: {Name: "Heartland", ShortName: ""},
            }),
        ).toBe("AGLIME (Heartland)");
    });

    it("returns N/A for empty description without source", () => {
        expect(formatMaterial({description: "", source: null})).toBe("N/A");
    });
});

describe("formatMaterialFromLoad", () => {
    it("formats from load row", () => {
        expect(
            formatMaterialFromLoad({
                LoadTypes: {Description: "DIRT (HAULING)"},
                Sources: {Name: "WS", ShortName: "WS"},
            }),
        ).toBe("DIRT (HAULING) (WS)");
    });
});
