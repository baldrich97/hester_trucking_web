export type PaystubJobRow = {
    TruckingRate: number;
    DriverRate?: number | null;
    TruckingRevenue?: number | null;
    Loads: {Hours?: number | null; Weight?: number | null}[];
};

export function sumJobLoads(loads: PaystubJobRow["Loads"]): number {
    return loads.reduce((total, load) => {
        const h = load.Hours ?? 0;
        const w = load.Weight ?? 0;
        return total + (h > 0 ? h : w);
    }, 0);
}

export function calculateJobRevenue(row: PaystubJobRow): number {
    if (row.TruckingRevenue) {
        return row.TruckingRevenue;
    }
    const totalLoadValue = sumJobLoads(row.Loads);
    const rate =
        row.DriverRate && row.DriverRate !== row.TruckingRate ? row.DriverRate : row.TruckingRate;
    return totalLoadValue * rate;
}

export function calculatePaystubGross(jobs: PaystubJobRow[]): number {
    const gross = jobs.reduce((sum, job) => sum + calculateJobRevenue(job), 0);
    return Math.round((gross + Number.EPSILON) * 100) / 100;
}

export function calculatePaystubNetTotal(
    gross: number,
    percentage: number | null | undefined,
): number {
    const pct = percentage ?? 0;
    return Math.round((gross * (pct / 100) + Number.EPSILON) * 100) / 100;
}

export function calculatePaystubTakeHome(
    netTotal: number,
    deductions: number | null | undefined,
    additions: number | null | undefined,
): number {
    const ded = deductions ?? 0;
    const add = additions ?? 0;
    return Math.round((netTotal - ded + add + Number.EPSILON) * 100) / 100;
}
