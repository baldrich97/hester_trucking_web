import type {CompleteFormOptions} from "../../prisma/zod";

export function fmtDate(d: Date): string {
    return d.toLocaleDateString();
}

export function addMonths(base: Date, months: number): Date {
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d;
}

export function cadenceTooltipDetail(
    cadence: CompleteFormOptions["ExpiryCadence"],
    filedDate: Date,
    explicitExpiration: Date | null,
    validityMonths: number | null | undefined,
): string {
    switch (cadence) {
        case "NONE":
            return "Does not expire.";
        case "EXPIRATION_DATE":
            return explicitExpiration
                ? `Expires: ${fmtDate(new Date(explicitExpiration))}`
                : "Missing expiration date.";
        case "CALENDAR_YEAR": {
            const y = filedDate.getFullYear();
            const validThrough = new Date(y, 11, 31);
            return `Valid through ${fmtDate(validThrough)} (calendar year).`;
        }
        case "CALENDAR_MONTH": {
            const validThrough = new Date(filedDate.getFullYear(), filedDate.getMonth() + 1, 0);
            return `Valid through ${fmtDate(validThrough)} (calendar month).`;
        }
        case "ROLLING_MONTHS": {
            const n = validityMonths ?? 1;
            const expires = addMonths(filedDate, n);
            return `Expires: ${fmtDate(expires)} (${n} rolling month(s)).`;
        }
        default:
            return "";
    }
}

export function cadenceHint(cadence: CompleteFormOptions["ExpiryCadence"], validityMonths?: number | null): string {
    switch (cadence) {
        case "NONE":
            return "Once filed, this form does not expire.";
        case "EXPIRATION_DATE":
            return "You will enter the date this form expires.";
        case "CALENDAR_YEAR":
            return "Enter the filing date; valid through December 31 of that year.";
        case "CALENDAR_MONTH":
            return "Enter the filing date; valid through the end of that month.";
        case "ROLLING_MONTHS":
            return `Enter the filing date; expires ${validityMonths ?? 1} month(s) later.`;
        default:
            return "";
    }
}

export type ExpiryPreview = {title: string; detail: string};

export function computeExpiryPreview(
    selectedForm: CompleteFormOptions | null,
    selectedDate: Date | null,
): ExpiryPreview | null {
    if (!selectedForm) return null;
    const cadence = selectedForm.ExpiryCadence;
    const picked = selectedDate;
    const validityMonths = selectedForm.ValidityMonths ?? 1;

    if (!picked) {
        switch (cadence) {
            case "NONE":
                return {
                    title: "No expiry",
                    detail: "This form does not expire once filed.",
                };
            case "EXPIRATION_DATE":
                return {
                    title: "Explicit expiration date",
                    detail: "Pick the exact date this filing should expire.",
                };
            case "CALENDAR_YEAR":
                return {
                    title: "Calendar year",
                    detail: "Pick the filing date; it stays valid through Dec 31 of that year.",
                };
            case "CALENDAR_MONTH":
                return {
                    title: "Calendar month",
                    detail: "Pick the filing date; it stays valid through the end of that month.",
                };
            case "ROLLING_MONTHS":
                return {
                    title: "Rolling months",
                    detail: `Pick the filing date; it expires ${validityMonths} month(s) later.`,
                };
            default:
                return null;
        }
    }

    switch (cadence) {
        case "NONE":
            return {
                title: "No expiry",
                detail: `Filed ${fmtDate(picked)}. This filing will not expire.`,
            };
        case "EXPIRATION_DATE":
            return {
                title: "Explicit expiration date",
                detail: `Filed ${fmtDate(new Date())} (today). Expires on ${fmtDate(picked)}.`,
            };
        case "CALENDAR_YEAR": {
            const expires = new Date(picked.getFullYear() + 1, 0, 1);
            return {
                title: "Calendar year",
                detail: `Filed ${fmtDate(picked)}. Valid through 12/31/${picked.getFullYear()} (expires ${fmtDate(expires)}).`,
            };
        }
        case "CALENDAR_MONTH": {
            const expires = new Date(picked.getFullYear(), picked.getMonth() + 1, 1);
            return {
                title: "Calendar month",
                detail: `Filed ${fmtDate(picked)}. Valid through ${fmtDate(new Date(picked.getFullYear(), picked.getMonth() + 1, 0))} (expires ${fmtDate(expires)}).`,
            };
        }
        case "ROLLING_MONTHS": {
            const expires = addMonths(picked, validityMonths);
            return {
                title: "Rolling months",
                detail: `Filed ${fmtDate(picked)}. Expires on ${fmtDate(expires)} (${validityMonths} month(s) rolling).`,
            };
        }
        default:
            return null;
    }
}
