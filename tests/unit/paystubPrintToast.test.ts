import {describe, expect, it, vi, beforeEach} from "vitest";
import {toast} from "react-toastify";
import {
    formatPaystubGrossMismatchMessage,
    paystubGrossDiffers,
} from "../../src/utils/paystubGrossMismatch";
import {calculatePaystubGross} from "../../src/utils/paystubRevenue";

vi.mock("react-toastify", () => ({
    toast: Object.assign(vi.fn(), {warning: vi.fn()}),
}));

/** Mirrors PayStub.tsx print button gross-mismatch branch. */
function warnIfPaystubGrossMismatch(
    storedGross: number | null | undefined,
    jobs: Parameters<typeof calculatePaystubGross>[0],
) {
    const calculatedGross = calculatePaystubGross(jobs);
    if (paystubGrossDiffers(storedGross ?? 0, calculatedGross)) {
        toast.warning(formatPaystubGrossMismatchMessage(storedGross ?? 0, calculatedGross), {
            autoClose: 15000,
        });
    }
}

const jobs = [
    {
        TruckingRate: 10,
        DriverRate: 10,
        Loads: [{Weight: 10, Hours: null}],
    },
];

describe("PayStub print gross alert handler", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("LW-C8: shows gross mismatch warning when stored gross differs", () => {
        warnIfPaystubGrossMismatch(80, jobs);
        expect(toast.warning).toHaveBeenCalledWith(
            formatPaystubGrossMismatchMessage(80, 100),
            expect.objectContaining({autoClose: 15000}),
        );
    });

    it("LW-C8b: skips warning when stored gross matches recalculated total", () => {
        warnIfPaystubGrossMismatch(100, jobs);
        expect(toast.warning).not.toHaveBeenCalled();
    });
});
