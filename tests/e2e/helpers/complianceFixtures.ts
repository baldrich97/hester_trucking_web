import type {Page} from "@playwright/test";
import {expect} from "@playwright/test";
import type {FormExpiryCadence, PrismaClient} from "@prisma/client";
import {
    getDriverFormComplianceEndDate,
    isDriverFormExpiringSoon,
    startOfDay,
} from "../../../src/utils/driverFormCompliance";
import {normalizeFormOptionPdfFlags} from "../../../src/utils/driverFormsPdf";
import {TEST_NAME_PREFIX} from "../../helpers/testData";
import type {TestRunTracker} from "../../helpers/testRunTracker";

export const TRACKER_W2_FORM_LABEL = `${TEST_NAME_PREFIX} Tracker W2`;
export const TRACKER_OO_FORM_LABEL = `${TEST_NAME_PREFIX} Tracker OO`;
export const TRACKER_EXPIRING_FORM_LABEL = `${TEST_NAME_PREFIX} Tracker Expiring`;
export const TRACKER_FLEET_WIDE_FORM_LABEL = `${TEST_NAME_PREFIX} Tracker Fleet`;
export const TRACKER_PDF_FORM_LABEL = `${TEST_NAME_PREFIX} Tracker PDF`;
export const TRACKER_PDF_COLUMN_LABEL = "TST-PDF-W2";

export const CADENCE_FORM_LABELS: Record<FormExpiryCadence, string> = {
    NONE: `${TEST_NAME_PREFIX} Cadence None`,
    EXPIRATION_DATE: `${TEST_NAME_PREFIX} Cadence ExpDate`,
    CALENDAR_YEAR: `${TEST_NAME_PREFIX} Cadence CalYear`,
    CALENDAR_MONTH: `${TEST_NAME_PREFIX} Cadence CalMonth`,
    ROLLING_MONTHS: `${TEST_NAME_PREFIX} Cadence Rolling`,
};

/** Matches `cadenceLabel` in DriverFormsExpiringSoon (underscores → spaces). */
export function expSoonCadenceCellLabel(cadence: FormExpiryCadence): string {
    return cadence.replace(/_/g, " ");
}

export type ResolvedComplianceForm = {
    formId: number;
    formOptionId: number;
    displayName: string;
    created: boolean;
};

export type ComplianceTrackerSeed = {
    token: string;
    w2DriverId: number;
    w2DriverName: string;
    ooDriverId: number;
    ooDriverName: string;
    ooTruckId: number;
    ooTruck2Id?: number;
    w2Form: ResolvedComplianceForm;
    ooForm: ResolvedComplianceForm;
    expiringForm: ResolvedComplianceForm;
    cadenceForms: Record<FormExpiryCadence, ResolvedComplianceForm>;
    fleetWideForm: ResolvedComplianceForm;
    pdfForm: ResolvedComplianceForm;
};

type FormNeed = {
    displayName: string;
    internalName: string;
    w2Visible: boolean;
    ooVisible: boolean;
    w2Required: boolean;
    ooRequired: boolean;
    expiryCadence?: FormExpiryCadence;
    validityMonths?: number | null;
    fleetWide?: boolean;
    includeInPdf?: boolean;
    pdfColumnLabel?: string | null;
};

type FormOptionConfig = Pick<
    FormNeed,
    | "w2Visible"
    | "ooVisible"
    | "w2Required"
    | "ooRequired"
    | "expiryCadence"
    | "validityMonths"
    | "fleetWide"
    | "includeInPdf"
    | "pdfColumnLabel"
>;

async function findFormByDisplayName(
    prisma: PrismaClient,
    displayName: string,
): Promise<ResolvedComplianceForm | null> {
    const row = await prisma.formOptions.findFirst({
        where: {Forms: {DisplayName: displayName}},
        include: {Forms: true},
    });
    if (!row) return null;
    return {
        formId: row.Form,
        formOptionId: row.ID,
        displayName: row.Forms.DisplayName,
        created: false,
    };
}

async function findDedicatedForm(
    prisma: PrismaClient,
    displayName: string,
    match: Partial<FormOptionConfig>,
): Promise<ResolvedComplianceForm | null> {
    const row = await prisma.formOptions.findFirst({
        where: {
            Forms: {DisplayName: displayName},
            ...(match.w2Visible !== undefined ? {W2Visible: match.w2Visible} : {}),
            ...(match.ooVisible !== undefined ? {OOVisible: match.ooVisible} : {}),
            ...(match.w2Required !== undefined ? {W2Required: match.w2Required} : {}),
            ...(match.ooRequired !== undefined ? {OORequired: match.ooRequired} : {}),
            ...(match.expiryCadence !== undefined ? {ExpiryCadence: match.expiryCadence} : {}),
            ...(match.fleetWide !== undefined ? {FleetWide: match.fleetWide} : {}),
        },
        include: {Forms: true},
    });
    if (!row) return null;
    return {
        formId: row.Form,
        formOptionId: row.ID,
        displayName: row.Forms.DisplayName,
        created: false,
    };
}

async function openFormOptionsPage(page: Page) {
    await page.goto("/drivers/form-options");
    await expect(page.getByText("Form options").first()).toBeVisible({timeout: 30000});
}

/** Delete every [TEST] form via the Form Options UI, then sweep leftovers in the DB. */
export async function deleteAllTestForms(page: Page, prisma: PrismaClient) {
    const listTestForms = () =>
        prisma.formOptions.findMany({
            where: {
                Forms: {
                    OR: [
                        {DisplayName: {startsWith: TEST_NAME_PREFIX}},
                        {Name: {startsWith: TEST_NAME_PREFIX}},
                    ],
                },
            },
            include: {Forms: true},
            orderBy: [{Forms: {DisplayName: "asc"}}],
        });

    let options = await listTestForms();
    if (!options.length) return;

    await openFormOptionsPage(page);
    for (const opt of options) {
        const row = page.getByRole("row").filter({hasText: opt.Forms.DisplayName});
        if ((await row.count()) === 0) continue;
        await row.getByRole("button", {name: "Delete form"}).click();
        await page.getByRole("button", {name: "Delete", exact: true}).click();
        await expect(page.getByText("Form deleted")).toBeVisible({timeout: 15000});
    }

    options = await listTestForms();
    for (const opt of options) {
        await prisma.driverForms.deleteMany({where: {Form: opt.Form}});
        await prisma.formOptions.deleteMany({where: {ID: opt.ID}});
        await prisma.forms.deleteMany({where: {ID: opt.Form}});
    }
}

async function fillNewFormName(page: Page, displayName: string) {
    const input = page.getByLabel("New form internal name");
    await expect(input).toBeVisible({timeout: 15000});
    await input.fill(displayName);
}

async function applyFormOptionConfig(
    prisma: PrismaClient,
    formOptionId: number,
    config: FormOptionConfig,
) {
    await prisma.formOptions.update({
        where: {ID: formOptionId},
        data: normalizeFormOptionPdfFlags({
            W2Visible: config.w2Visible ?? false,
            OOVisible: config.ooVisible ?? false,
            W2Required: config.w2Required ?? false,
            OORequired: config.ooRequired ?? false,
            FleetWide: config.fleetWide ?? false,
            ExpiryCadence: config.expiryCadence ?? "EXPIRATION_DATE",
            ValidityMonths: config.validityMonths ?? null,
            IncludeInPdf: config.includeInPdf ?? false,
            PdfColumnLabel: config.pdfColumnLabel ?? null,
        }),
    });
}

export async function ensureFormViaFormOptions(
    page: Page,
    prisma: PrismaClient,
    tracker: TestRunTracker,
    need: FormNeed,
): Promise<ResolvedComplianceForm> {
    const config: FormOptionConfig = {
        w2Visible: need.w2Visible,
        ooVisible: need.ooVisible,
        w2Required: need.w2Required,
        ooRequired: need.ooRequired,
        expiryCadence: need.expiryCadence ?? "EXPIRATION_DATE",
        validityMonths: need.validityMonths ?? null,
        fleetWide: need.fleetWide ?? false,
        includeInPdf: need.includeInPdf ?? false,
        pdfColumnLabel: need.pdfColumnLabel ?? null,
    };

    const dedicated = await findDedicatedForm(prisma, need.displayName, config);
    if (dedicated) return dedicated;

    const existingByName = await findFormByDisplayName(prisma, need.displayName);
    if (existingByName) {
        await applyFormOptionConfig(prisma, existingByName.formOptionId, config);
        return existingByName;
    }

    await openFormOptionsPage(page);
    await fillNewFormName(page, need.displayName);
    await page.getByRole("button", {name: "Add form"}).click();
    await expect(page.getByText("Form added")).toBeVisible({timeout: 15000});

    const created = await prisma.forms.findFirst({
        where: {DisplayName: need.displayName},
        include: {FormOptions: true},
    });
    if (!created?.FormOptions?.[0]) {
        throw new Error(`Form ${need.internalName} was not created`);
    }
    tracker.track("forms", created.ID);
    tracker.track("formOptions", created.FormOptions[0].ID);
    await applyFormOptionConfig(prisma, created.FormOptions[0].ID, config);

    return {
        formId: created.ID,
        formOptionId: created.FormOptions[0].ID,
        displayName: created.DisplayName,
        created: true,
    };
}

export async function seedComplianceTrackerDrivers(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
): Promise<Pick<ComplianceTrackerSeed, "w2DriverId" | "w2DriverName" | "ooDriverId" | "ooDriverName" | "ooTruckId">> {
    const farFuture = new Date("2099-06-15T12:00:00.000Z");
    const state = await prisma.states.findFirst({orderBy: {ID: "asc"}});
    if (!state) throw new Error("No states in DB");

    const w2Driver = await prisma.drivers.create({
        data: {
            FirstName: TEST_NAME_PREFIX,
            LastName: `TrkW2-${token}`,
            OwnerOperator: false,
            Active: true,
            Deleted: false,
            License: `TRK-W2-${token}`,
            LicenseExpiration: farFuture,
        },
    });
    tracker.track("drivers", w2Driver.ID);

    const truck = await prisma.trucks.create({
        data: {
            Name: `${TEST_NAME_PREFIX} TrkOO-${token}`,
            VIN: `VINTRK${token}`.slice(0, 17).padEnd(17, "0"),
            LicensePlate: `TRK${token}`.slice(0, 8),
            Make: "Kenworth",
            Model: "T680",
            ModelYear: 2020,
            LicensedState: state.ID,
            Active: true,
            Deleted: false,
        },
    });
    tracker.track("trucks", truck.ID);

    const ooDriver = await prisma.drivers.create({
        data: {
            FirstName: TEST_NAME_PREFIX,
            LastName: `TrkOO-${token}`,
            OwnerOperator: true,
            Active: true,
            Deleted: false,
            License: `TRK-OO-${token}`,
            LicenseExpiration: farFuture,
        },
    });
    tracker.track("drivers", ooDriver.ID);

    const driven = await prisma.trucksDriven.create({
        data: {
            DriverID: ooDriver.ID,
            TruckID: truck.ID,
            DateDriven: new Date(),
        },
    });
    tracker.track("trucksDriven", driven.ID);

    return {
        w2DriverId: w2Driver.ID,
        w2DriverName: `${TEST_NAME_PREFIX} TrkW2-${token}`,
        ooDriverId: ooDriver.ID,
        ooDriverName: `${TEST_NAME_PREFIX} TrkOO-${token}`,
        ooTruckId: truck.ID,
    };
}

/** Adds a second truck to the OO entity (for fleet-wide required-form tests). */
export async function seedSecondOoTruck(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    ooDriverId: number,
    token: string,
): Promise<number> {
    const state = await prisma.states.findFirst({orderBy: {ID: "asc"}});
    if (!state) throw new Error("No states in DB");

    const truck2 = await prisma.trucks.create({
        data: {
            Name: `${TEST_NAME_PREFIX} TrkOO2-${token}`,
            VIN: `VIN2TRK${token}`.slice(0, 17).padEnd(17, "0"),
            LicensePlate: `TRK2${token}`.slice(0, 8),
            Make: "Peterbilt",
            Model: "579",
            ModelYear: 2021,
            LicensedState: state.ID,
            Active: true,
            Deleted: false,
        },
    });
    tracker.track("trucks", truck2.ID);

    const driven = await prisma.trucksDriven.create({
        data: {
            DriverID: ooDriverId,
            TruckID: truck2.ID,
            DateDriven: new Date(),
        },
    });
    tracker.track("trucksDriven", driven.ID);
    return truck2.ID;
}

export async function seedComplianceTrackerForms(
    page: Page,
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
): Promise<
    Pick<
        ComplianceTrackerSeed,
        "w2Form" | "ooForm" | "expiringForm" | "cadenceForms" | "fleetWideForm" | "pdfForm"
    >
> {
    const w2Form = await ensureFormViaFormOptions(page, prisma, tracker, {
        displayName: TRACKER_W2_FORM_LABEL,
        internalName: `${TEST_NAME_PREFIX}-TRK-W2-${token}`,
        w2Visible: true,
        ooVisible: false,
        w2Required: true,
        ooRequired: false,
        expiryCadence: "EXPIRATION_DATE",
    });

    const ooForm = await ensureFormViaFormOptions(page, prisma, tracker, {
        displayName: TRACKER_OO_FORM_LABEL,
        internalName: `${TEST_NAME_PREFIX}-TRK-OO-${token}`,
        w2Visible: false,
        ooVisible: true,
        w2Required: false,
        ooRequired: true,
        expiryCadence: "EXPIRATION_DATE",
    });

    const expiringForm = await ensureFormViaFormOptions(page, prisma, tracker, {
        displayName: TRACKER_EXPIRING_FORM_LABEL,
        internalName: `${TEST_NAME_PREFIX}-TRK-EXP-${token}`,
        w2Visible: true,
        ooVisible: false,
        w2Required: false,
        ooRequired: false,
        expiryCadence: "EXPIRATION_DATE",
    });

    const cadenceForms = {} as Record<FormExpiryCadence, ResolvedComplianceForm>;
    const cadences = Object.keys(CADENCE_FORM_LABELS) as FormExpiryCadence[];
    for (const cadence of cadences) {
        cadenceForms[cadence] = await ensureFormViaFormOptions(page, prisma, tracker, {
            displayName: CADENCE_FORM_LABELS[cadence],
            internalName: `${TEST_NAME_PREFIX}-CAD-${cadence}-${token}`,
            w2Visible: true,
            ooVisible: false,
            w2Required: false,
            ooRequired: false,
            expiryCadence: cadence,
            validityMonths: cadence === "ROLLING_MONTHS" ? 1 : null,
        });
    }

    const fleetWideForm = await ensureFormViaFormOptions(page, prisma, tracker, {
        displayName: TRACKER_FLEET_WIDE_FORM_LABEL,
        internalName: `${TEST_NAME_PREFIX}-TRK-FLEET-${token}`,
        w2Visible: false,
        ooVisible: true,
        w2Required: false,
        ooRequired: true,
        fleetWide: true,
        expiryCadence: "EXPIRATION_DATE",
    });

    const pdfForm = await ensureFormViaFormOptions(page, prisma, tracker, {
        displayName: TRACKER_PDF_FORM_LABEL,
        internalName: `${TEST_NAME_PREFIX}-TRK-PDF-${token}`,
        w2Visible: true,
        ooVisible: false,
        w2Required: false,
        ooRequired: false,
        expiryCadence: "EXPIRATION_DATE",
        includeInPdf: true,
        pdfColumnLabel: TRACKER_PDF_COLUMN_LABEL,
    });

    return {w2Form, ooForm, expiringForm, cadenceForms, fleetWideForm, pdfForm};
}

/** Filing dates chosen so each cadence is still compliant today and expires within 30 days when possible. */
export function cadenceFilingFixture(
    cadence: FormExpiryCadence,
    validityMonths: number | null | undefined,
    now = new Date(),
): {created: Date; expiration: Date | null} {
    const noon = (d: Date) => {
        const x = new Date(d);
        x.setHours(12, 0, 0, 0);
        return x;
    };
    const today = startOfDay(now);

    switch (cadence) {
        case "NONE":
            return {created: noon(today), expiration: null};
        case "EXPIRATION_DATE": {
            const expiration = noon(today);
            expiration.setDate(expiration.getDate() + 15);
            return {created: noon(today), expiration};
        }
        case "CALENDAR_MONTH":
            return {created: noon(new Date(today.getFullYear(), today.getMonth(), 1)), expiration: null};
        case "CALENDAR_YEAR":
            return {created: noon(new Date(today.getFullYear(), 0, 10)), expiration: null};
        case "ROLLING_MONTHS": {
            const created = noon(today);
            created.setDate(created.getDate() - 25);
            return {created, expiration: null};
        }
        default:
            return {created: noon(today), expiration: null};
    }
}

export function cadenceQualifiesForExpSoon(
    cadence: FormExpiryCadence,
    validityMonths: number | null | undefined,
    now = new Date(),
): boolean {
    if (cadence === "NONE") return false;
    const filing = cadenceFilingFixture(cadence, validityMonths, now);
    const record = {Created: filing.created, Expiration: filing.expiration};
    return isDriverFormExpiringSoon(record, cadence, validityMonths, 30, now);
}

export function expectedExpSoonEndDateLabel(
    cadence: FormExpiryCadence,
    validityMonths: number | null | undefined,
    now = new Date(),
): string {
    const filing = cadenceFilingFixture(cadence, validityMonths, now);
    const end = getDriverFormComplianceEndDate(
        {Created: filing.created, Expiration: filing.expiration},
        cadence,
        validityMonths,
    );
    if (!end) return "";
    return new Date(end.toISOString()).toLocaleDateString();
}

export async function cadenceQualifiesForExpSoonFromDb(
    prisma: PrismaClient,
    driverId: number,
    formId: number,
    cadence: FormExpiryCadence,
    validityMonths: number | null | undefined,
    now = new Date(),
): Promise<boolean> {
    const df = await prisma.driverForms.findUnique({
        where: {Driver_Form: {Driver: driverId, Form: formId}},
    });
    if (!df) return false;
    return isDriverFormExpiringSoon(
        {Created: df.Created, Expiration: df.Expiration},
        cadence,
        validityMonths,
        30,
        now,
    );
}

export async function expectedExpSoonEndDateLabelFromDb(
    prisma: PrismaClient,
    driverId: number,
    formId: number,
    cadence: FormExpiryCadence,
    validityMonths: number | null | undefined,
): Promise<string> {
    const df = await prisma.driverForms.findUnique({
        where: {Driver_Form: {Driver: driverId, Form: formId}},
    });
    if (!df) return "";
    const end = getDriverFormComplianceEndDate(
        {Created: df.Created, Expiration: df.Expiration},
        cadence,
        validityMonths,
    );
    if (!end) return "";
    return new Date(end.toISOString()).toLocaleDateString();
}

export async function fileDriverFormWithCadence(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    driverId: number,
    formId: number,
    cadence: FormExpiryCadence,
    validityMonths?: number | null,
) {
    const {created, expiration} = cadenceFilingFixture(cadence, validityMonths);
    await prisma.driverForms.upsert({
        where: {Driver_Form: {Driver: driverId, Form: formId}},
        create: {
            Driver: driverId,
            Form: formId,
            Expiration: expiration,
            Created: created,
            CarrierID: null,
            Filer: null,
        },
        update: {Expiration: expiration, Created: created},
    });
    tracker.trackDriverForm(driverId, formId);
}

/** File a driver form with expiration `daysFromNow` calendar days ahead (UTC noon). */
export async function fileDriverFormExpiring(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    driverId: number,
    formId: number,
    daysFromNow: number,
) {
    const exp = new Date();
    exp.setDate(exp.getDate() + daysFromNow);
    exp.setHours(12, 0, 0, 0);
    const filed = new Date();
    filed.setHours(12, 0, 0, 0);
    await prisma.driverForms.upsert({
        where: {Driver_Form: {Driver: driverId, Form: formId}},
        create: {
            Driver: driverId,
            Form: formId,
            Expiration: exp,
            Created: filed,
            CarrierID: null,
            Filer: null,
        },
        update: {Expiration: exp, Created: filed},
    });
    tracker.trackDriverForm(driverId, formId);
}

export async function fileAllCadenceDemonstrations(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    driverId: number,
    cadenceForms: Record<FormExpiryCadence, ResolvedComplianceForm>,
    skip: FormExpiryCadence[] = ["ROLLING_MONTHS"],
) {
    const cadences = Object.keys(cadenceForms) as FormExpiryCadence[];
    for (const cadence of cadences) {
        if (skip.includes(cadence)) continue;
        const form = cadenceForms[cadence];
        const validity = cadence === "ROLLING_MONTHS" ? 1 : null;
        await fileDriverFormWithCadence(prisma, tracker, driverId, form.formId, cadence, validity);
    }
}

export async function w2FormColumnIndex(prisma: PrismaClient, formId: number): Promise<number> {
    const forms = await prisma.formOptions.findMany({
        where: {W2Visible: true},
        orderBy: [{Forms: {DisplayName: "asc"}}, {Form: "asc"}],
    });
    const idx = forms.findIndex((f) => f.Form === formId);
    if (idx < 0) throw new Error(`W2 form ${formId} not visible on grid`);
    return idx;
}

export async function ooFormColumnIndex(prisma: PrismaClient, formId: number): Promise<number> {
    const forms = await prisma.formOptions.findMany({
        where: {OOVisible: true},
        orderBy: [{Forms: {DisplayName: "asc"}}, {Form: "asc"}],
    });
    const idx = forms.findIndex((f) => f.Form === formId);
    if (idx < 0) throw new Error(`OO form ${formId} not visible on grid`);
    return idx;
}

export function ooEntityRow(page: Page, driverName: string) {
    return page
        .locator("div")
        .filter({has: page.getByText(driverName)})
        .filter({has: page.locator("input[type='checkbox']")})
        .first();
}

/** OO entity row block (status icon + driver name + form checkboxes). */
export function ooEntityBlock(page: Page, driverName: string) {
    return page
        .getByText(driverName, {exact: true})
        .locator("xpath=ancestor::div[.//input[@type='checkbox']][1]");
}

export async function countDistinctTrucksForOoDriver(
    prisma: PrismaClient,
    driverId: number,
): Promise<number> {
    const rows = await prisma.trucksDriven.findMany({
        where: {DriverID: driverId},
        include: {Trucks: true},
    });
    const ids = new Set<number>();
    for (const row of rows) {
        if (row.Trucks && !row.Trucks.Deleted) ids.add(row.TruckID);
    }
    return ids.size;
}
