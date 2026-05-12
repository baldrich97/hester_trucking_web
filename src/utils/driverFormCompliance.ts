import type {FormExpiryCadence, Trucks} from "@prisma/client";

export function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

/**
 * Last calendar day on which this filing is still compliant (inclusive), or `null` if it does not expire (`NONE`).
 * Aligns with `isDriverFormRecordCompliant` and `DriverForms` cadence copy.
 */
export function getDriverFormComplianceEndDate(
    record: { Expiration: Date | null; Created: Date },
    cadence: FormExpiryCadence,
    validityMonths: number | null | undefined,
): Date | null {
    switch (cadence) {
        case "NONE":
            return null;
        case "EXPIRATION_DATE": {
            if (!record.Expiration) return null;
            return startOfDay(new Date(record.Expiration));
        }
        case "CALENDAR_YEAR": {
            const y = record.Created.getFullYear();
            return startOfDay(new Date(y, 11, 31));
        }
        case "CALENDAR_MONTH": {
            const end = new Date(record.Created.getFullYear(), record.Created.getMonth() + 1, 0);
            return startOfDay(end);
        }
        case "ROLLING_MONTHS": {
            const n = validityMonths ?? 1;
            const until = new Date(record.Created);
            until.setMonth(until.getMonth() + n);
            return startOfDay(until);
        }
        default:
            return null;
    }
}

/** Driver CDL / license expiration is set and falls within the next `daysAhead` calendar days (still valid today). */
export function isDriverLicenseExpiringSoon(
    licenseExpiration: Date | null | undefined,
    daysAhead: number,
    now = new Date(),
): boolean {
    if (!licenseExpiration) return false;
    const end = startOfDay(new Date(licenseExpiration));
    const today = startOfDay(now);
    if (end < today) return false;
    const windowEnd = startOfDay(new Date(today));
    windowEnd.setDate(windowEnd.getDate() + daysAhead);
    return end <= windowEnd;
}

/** Still compliant today, and compliance end falls within the next `daysAhead` calendar days (inclusive). */
export function isDriverFormExpiringSoon(
    record: { Expiration: Date | null; Created: Date },
    cadence: FormExpiryCadence,
    validityMonths: number | null | undefined,
    daysAhead = 30,
    now = new Date(),
): boolean {
    if (cadence === "NONE") return false;
    if (!isDriverFormRecordCompliant(record, cadence, validityMonths, now)) return false;
    const end = getDriverFormComplianceEndDate(record, cadence, validityMonths);
    if (!end) return false;
    const today = startOfDay(now);
    const windowEnd = startOfDay(new Date(today));
    windowEnd.setDate(windowEnd.getDate() + daysAhead);
    return end >= today && end <= windowEnd;
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

export type DriverFormRow = {
    Form: number;
    Expiration: Date | null;
    Created: Date;
    CarrierID?: number | null;
    Filer?: string | null;
};

export type DriverComplianceShape = {
    ID: number;
    CarrierID: number | null;
    OwnerOperator: boolean;
    DriverForms: DriverFormRow[];
    /** When present (OO flows), used for entity truck count / vitals. */
    TrucksDriven?: TrucksDrivenRow[];
};

export type FormOptionComplianceShape = {
    Form: number;
    FleetWide: boolean;
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

/** W-2: filing must exist on this driver. OO entity pooling uses `isFormSatisfiedForOoEntity`. */
export function isFormSatisfiedForDriver(
    driver: DriverComplianceShape,
    formOption: FormOptionComplianceShape,
    _allDriversInScope: DriverComplianceShape[],
): boolean {
    const formId = formOption.Form;
    const rec = getDriverFormRecord(driver.DriverForms, formId);
    if (!rec) return false;
    return isDriverFormRecordCompliant(rec, formOption.ExpiryCadence, formOption.ValidityMonths);
}

/**
 * One compliant filing in the OO entity satisfies the form.
 * Under a carrier, rows with `CarrierID` matching that carrier (or legacy null) count toward the entity.
 */
export function isFormSatisfiedForOoEntity(
    entityDriverShapes: DriverComplianceShape[],
    entityCarrierId: number | null | undefined,
    formOption: FormOptionComplianceShape,
): boolean {
    const formId = formOption.Form;
    const carrierScope = entityCarrierId != null && entityCarrierId > 0;
    for (const d of entityDriverShapes) {
        const rec = getDriverFormRecord(d.DriverForms, formId);
        if (
            !rec ||
            !isDriverFormRecordCompliant(rec, formOption.ExpiryCadence, formOption.ValidityMonths)
        ) {
            continue;
        }
        if (!carrierScope) {
            return true;
        }
        const cid = rec.CarrierID;
        if (cid === entityCarrierId || cid == null || cid === undefined) {
            return true;
        }
    }
    return false;
}

export function ooEntityKey(carrierId: number | null | undefined, driverId: number): string {
    if (carrierId != null && carrierId > 0) {
        return `c:${carrierId}`;
    }
    return `s:${driverId}`;
}

export function groupOoDriversByEntity<T extends { ID: number; CarrierID?: number | null | undefined }>(
    drivers: T[],
): Map<string, T[]> {
    const m = new Map<string, T[]>();
    for (const d of drivers) {
        const k = ooEntityKey(d.CarrierID, d.ID);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(d);
    }
    return m;
}

/** Primary driver for mutations: stable lowest ID in entity. */
export function primaryDriverIdForEntity<T extends { ID: number }>(entityDrivers: T[]): number {
    return entityDrivers.reduce((min, d) => (d.ID < min ? d.ID : min), entityDrivers[0]!.ID);
}

export type TrucksDrivenRow = { TruckID: number; Trucks: Trucks | null };

/** Distinct non-deleted trucks across entity drivers (union of TrucksDriven). */
export function collectEntityTrucks(
    drivers: { TrucksDriven?: TrucksDrivenRow[] }[],
): Map<number, Trucks> {
    const map = new Map<number, Trucks>();
    for (const d of drivers) {
        for (const row of d.TrucksDriven ?? []) {
            if (!row.Trucks || row.Trucks.Deleted) continue;
            map.set(row.TruckID, row.Trucks);
        }
    }
    return map;
}

export function entityDistinctTruckCount(
    drivers: { TrucksDriven?: TrucksDrivenRow[] }[],
): number {
    return collectEntityTrucks(drivers).size;
}

/** Human-readable list of missing OO truck fields (empty if truck is OK). */
export function truckOoVitalMissingReasons(t: Trucks | null | undefined): string[] {
    const reasons: string[] = [];
    if (!t || t.Deleted) {
        reasons.push("Truck missing or deleted");
        return reasons;
    }
    if (!t.Name?.trim()) reasons.push("Name");
    if (!t.VIN?.trim()) reasons.push("VIN");
    if (!t.LicensePlate?.trim()) reasons.push("License plate");
    if (!t.Make?.trim()) reasons.push("Make");
    if (!t.Model?.trim()) reasons.push("Model");
    if (t.ModelYear == null || t.ModelYear < 1900 || t.ModelYear > 2100) reasons.push("Model year");
    if (t.LicensedState == null) reasons.push("Licensed state");
    return reasons;
}

/** OO compliance: Name, VIN, plate, make, model, year, licensed state. */
export function truckOoVitalsOk(t: Trucks | null | undefined): boolean {
    return truckOoVitalMissingReasons(t).length === 0;
}

export function isOoFormRequired(
    opt: FormOptionComplianceShape,
    entityTruckCount: number,
): boolean {
    if (!opt.OOVisible) return false;
    if (opt.OORequired && !opt.FleetWide) return true;
    if (!opt.OORequired && opt.FleetWide) return entityTruckCount > 1;
    if (opt.OORequired && opt.FleetWide) return entityTruckCount > 1;
    return false;
}

export function ooEntityMissingRequiredForm(
    entityDriverShapes: DriverComplianceShape[],
    formOptions: FormOptionComplianceShape[],
    entityTruckCount: number,
    entityCarrierId: number | null | undefined,
): boolean {
    for (const opt of formOptions) {
        if (!isOoFormRequired(opt, entityTruckCount)) continue;
        if (!isFormSatisfiedForOoEntity(entityDriverShapes, entityCarrierId, opt)) return true;
    }
    return false;
}

export function driverMissingRequiredForm(
    driver: DriverComplianceShape,
    formOptions: FormOptionComplianceShape[],
    allDrivers: DriverComplianceShape[],
    mode: "w2" | "oo",
): boolean {
    if (mode === "w2") {
        for (const opt of formOptions) {
            if (!opt.W2Visible || !opt.W2Required) continue;
            if (!isFormSatisfiedForDriver(driver, opt, allDrivers)) return true;
        }
        return false;
    }
    const key = ooEntityKey(driver.CarrierID, driver.ID);
    const entityShapes = allDrivers.filter((d) => ooEntityKey(d.CarrierID, d.ID) === key);
    const truckCount = entityDistinctTruckCount(entityShapes);
    const entityCarrierId = driver.CarrierID;
    return ooEntityMissingRequiredForm(entityShapes, formOptions, truckCount, entityCarrierId);
}

/** All distinct non-deleted trucks across these drivers have OO vitals; at least one truck required. */
export function ooEntityTrucksVitalOk(
    drivers: { TrucksDriven?: TrucksDrivenRow[] }[],
): boolean {
    const trucks = collectEntityTrucks(drivers);
    if (trucks.size === 0) return false;
    for (const t of Array.from(trucks.values())) {
        if (!truckOoVitalsOk(t)) return false;
    }
    return true;
}

/** Single-driver helper (union of trucks that driver has driven). */
export function ooDriverTrucksVitalOk(trucksDriven: TrucksDrivenRow[]): boolean {
    return ooEntityTrucksVitalOk([{ TrucksDriven: trucksDriven }]);
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
