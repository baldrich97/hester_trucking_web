import {describe, expect, it} from "vitest";
import {
    formatPaystubGrossMismatchMessage,
    paystubGrossDiffers,
} from "../../src/utils/paystubGrossMismatch";
import {calculatePaystubGross} from "../../src/utils/paystubRevenue";

describe("paystubGrossMismatch", () => {
    it("PG-U1: detects mismatch beyond penny tolerance", () => {
        expect(paystubGrossDiffers(100, 120)).toBe(true);
        expect(paystubGrossDiffers(100, 100.005)).toBe(false);
        expect(paystubGrossDiffers(null, 50)).toBe(true);
    });

    it("PG-U2: formats user-facing mismatch message", () => {
        expect(formatPaystubGrossMismatchMessage(100, 120)).toBe(
            "Stored gross pay ($100.00) differs from recalculated job totals ($120.00). The PDF uses recalculated amounts.",
        );
    });

    it("PG-U3: integrates with calculatePaystubGross for job rows", () => {
        const jobs = [
            {
                TruckingRate: 10,
                DriverRate: 10,
                Loads: [{Weight: 10, Hours: null}],
            },
        ];
        const calculated = calculatePaystubGross(jobs);
        expect(calculated).toBe(100);
        expect(paystubGrossDiffers(80, calculated)).toBe(true);
        expect(formatPaystubGrossMismatchMessage(80, calculated)).toContain("$80.00");
        expect(formatPaystubGrossMismatchMessage(80, calculated)).toContain("$100.00");
    });
});
