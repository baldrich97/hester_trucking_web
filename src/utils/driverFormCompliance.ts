import type {FormExpiryCadence, Trucks} from "@prisma/client";

export function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function isDriverFormRecordCompliant(
    record: { Expiration: Date | null; Created: Date },
    cadence: FormExpiryCadence,
    validityMonths: number | null | undefined,
    now: Date = new Date(),
): boolean {
    const today = startOfDay(now);
    switch (cadence) {
        case "NONE":
            return true;
        case "EXPIRATION_DATE": {
            if (!record.Expiration) return false;
            return startOfDay(record.Expiration) >= today;
        }
        case "CALENDAR_YEAR":
            return record.Created.getFullYear() === now.getFullYear();
        case "CALENDAR_MONTH":
            return (
                record.Created.getFullYear() === now.getFullYear() &&
                record.Created.getMonth() === now.getMonth()
            );
        case "ROLLING_MONTHS": {
            const n = validityMonths ?? 1;
            const until = new Date(record.Created);
            until.setMonth(until.getMonth() + n);
            return startOfDay(until) >= today;
        }
        default:
            return true;
    }
}

export type DriverFormRow = { Form: number; Expiration: Date | null; Created: Date };

export type DriverComplianceShape = {
    ID: number;
    CarrierID: number | null;
    OwnerOperator: boolean;
    DriverForms: DriverFormRow[];
};

export type FormOptionComplianceShape = {
    Form: number;
    CarrierWide: boolean;
    ExpiryCadence: FormExpiryCadence;
    ValidityMonths: number | null;
    W2Visible: boolean;
    OOVisible: boolean;
    W2Required: boolean;
    OORequired: boolean;
};

export function getDriverFormRecord(
    driverForms: DriverFormRow[] | undefined,
    formId: number,
): DriverFormRow | null {
    return driverForms?.find((df) => df.Form === formId) ?? null;
}

export function isFormSatisfiedForDriver(
    driver: DriverComplianceShape,
    formOption: FormOptionComplianceShape,
    allDriversInScope: DriverComplianceShape[],
): boolean {
    const formId = formOption.Form;
    if (formOption.CarrierWide && driver.CarrierID) {
        const mates = allDriversInScope.filter((d) => d.CarrierID === driver.CarrierID);
        for (const d of mates) {
            const rec = getDriverFormRecord(d.DriverForms, formId);
            if (
                rec &&
                isDriverFormRecordCompliant(rec, formOption.ExpiryCadence, formOption.ValidityMonths)
            ) {
                return true;
            }
        }
        return false;
    }
    const rec = getDriverFormRecord(driver.DriverForms, formId);
    if (!rec) return false;
    return isDriverFormRecordCompliant(rec, formOption.ExpiryCadence, formOption.ValidityMonths);
}

export function driverMissingRequiredForm(
    driver: DriverComplianceShape,
    formOptions: FormOptionComplianceShape[],
    allDrivers: DriverComplianceShape[],
    mode: "w2" | "oo",
): boolean {
    for (const opt of formOptions) {
        const visible = mode === "w2" ? opt.W2Visible : opt.OOVisible;
        const required = mode === "w2" ? opt.W2Required : opt.OORequired;
        if (!visible || !required) continue;
        if (!isFormSatisfiedForDriver(driver, opt, allDrivers)) return true;
    }
    return false;
}

export function ooDriverTrucksVitalOk(
    trucksDriven: { TruckID: number; Trucks: Trucks | null }[],
): boolean {
    const byTruck = new Map<number, Trucks>();
    for (const row of trucksDriven) {
        if (row.Trucks) byTruck.set(row.TruckID, row.Trucks);
    }
    if (byTruck.size === 0) return false;
    for (const t of Array.from(byTruck.values())) {
        if (t.Deleted) return false;
        if (!t.VIN?.trim()) return false;
        if (!t.LicensePlate?.trim()) return false;
    }
    return true;
}

export function modalTitleForCadence(cadence: FormExpiryCadence): string {
    switch (cadence) {
        case "NONE":
            return "Confirm on file";
        case "EXPIRATION_DATE":
        case "ROLLING_MONTHS":
            return "Set expiration date";
        case "CALENDAR_YEAR":
        case "CALENDAR_MONTH":
            return "Set receipt / filing date";
        default:
            return "Set date";
    }
}
