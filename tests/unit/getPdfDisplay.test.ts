import {describe, expect, it} from "vitest";
import {formatMaterial} from "../../src/utils/formatMaterial";

/**
 * PDF API routes use @react-pdf/renderer server-side.
 * Full render tests require heavy mocking; we verify the display helper used by PDF row components.
 */
describe("getPDF display helpers", () => {
    it("invoice row material includes source short name", () => {
        const label = formatMaterial({
            description: "ASPHALT",
            source: {Name: "Fruitland", ShortName: "FRUIT"},
        });
        expect(label).toBe("ASPHALT (FRUIT)");
    });

    it("legacy rows without source pass through description", () => {
        expect(formatMaterial({description: "ASPHALT (FRUITLAND)", source: null})).toBe(
            "ASPHALT (FRUITLAND)",
        );
    });
});
