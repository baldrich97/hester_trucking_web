import {describe, expect, it} from "vitest";
import {
    calculateJobRevenue,
    calculatePaystubGross,
    calculatePaystubNetTotal,
    calculatePaystubTakeHome,
} from "../../src/utils/paystubRevenue";

describe("paystubRevenue", () => {
    it("prefers hours over weight for job revenue", () => {
        const revenue = calculateJobRevenue({
            TruckingRate: 10,
            DriverRate: 10,
            Loads: [{Weight: 20, Hours: 5}],
        });
        expect(revenue).toBe(50);
    });

    it("calculates gross, net, and take-home from live jobs", () => {
        const jobs = [
            {
                TruckingRate: 10,
                DriverRate: 10,
                Loads: [{Weight: 10, Hours: null}],
            },
            {
                TruckingRate: 5,
                DriverRate: 5,
                Loads: [{Weight: 4, Hours: null}],
            },
        ];
        const gross = calculatePaystubGross(jobs);
        expect(gross).toBe(120);
        const net = calculatePaystubNetTotal(gross, 80);
        expect(net).toBe(96);
        expect(calculatePaystubTakeHome(net, 10, 5)).toBe(91);
    });
});
