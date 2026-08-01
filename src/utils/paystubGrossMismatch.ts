/** True when stored gross and live job totals differ by more than `tolerance` dollars. */
export function paystubGrossDiffers(
    stored: number | null | undefined,
    calculated: number,
    tolerance = 0.01,
): boolean {
    return Math.abs((stored ?? 0) - calculated) > tolerance;
}

export function formatPaystubGrossMismatchMessage(stored: number, calculated: number): string {
    return `Stored gross pay ($${stored.toFixed(2)}) differs from recalculated job totals ($${calculated.toFixed(2)}). The PDF uses recalculated amounts.`;
}
