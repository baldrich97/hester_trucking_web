import {PrismaClient} from "@prisma/client";
import {loadTestEnv} from "../../helpers/dbGuard";
import {TEST_NAME_PREFIX} from "../../helpers/testData";
import type {TestRunTracker} from "../../helpers/testRunTracker";
import {formatDateToWeek} from "../../../src/utils/UtilityFunctions";
import {NEW_LOAD_TYPE_ID_THRESHOLD} from "../../../src/config/sourcesCutover";

/**
 * Prisma-only seed helpers for E2E specs. Kept separate from tests/helpers/dbFixtures
 * on purpose: that module imports the tRPC caller (whole server graph), which the
 * Playwright process does not need.
 */

/** Isolated week for E2E-seeded rows; distinct from vitest DB weeks (2099-W01/W02). */
export const E2E_SEED_WEEK = "2099-W05";

export function createSeedPrisma(): PrismaClient {
    loadTestEnv();
    return new PrismaClient();
}

/** Ticket inside the reserved 999xxx range; time-derived to dodge collisions. */
export function e2eSeedTicket(): number {
    return 999400 + (Date.now() % 400);
}

export type InvoiceWeeklySeed = {
    customerId: number;
    customerName: string;
    /** Distinct search token for the customer autocomplete. */
    customerQuery: string;
    weeklyId: number;
    jobId: number;
    loadId: number;
};

/**
 * Creates an isolated [TEST] customer with one closed weekly (Revenue set,
 * InvoiceID null) backed by a job + load, so it shows in the invoice form's
 * weeklies list for that customer.
 */
export async function seedWeeklyForInvoice(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
): Promise<InvoiceWeeklySeed> {
    const state = await prisma.states.findFirst({orderBy: {ID: "asc"}});
    const driver = await prisma.drivers.findFirst({where: {Active: true}, orderBy: {ID: "asc"}});
    const truck = await prisma.trucks.findFirst({where: {Active: true}, orderBy: {ID: "asc"}});
    const deliveryLocation = await prisma.deliveryLocations.findFirst({orderBy: {ID: "asc"}});
    const loadType = await prisma.loadTypes.findFirst({
        where: {OR: [{Deleted: false}, {Deleted: null}]},
        orderBy: {ID: "asc"},
    });
    if (!state || !driver || !truck || !deliveryLocation || !loadType) {
        throw new Error("Dev DB missing base fixtures (state, active driver/truck, DL, load type).");
    }

    const customerQuery = `InvCust-${token}`;
    const customer = await prisma.customers.create({
        data: {
            Name: `${TEST_NAME_PREFIX} ${customerQuery}`,
            Street: "100 Test Lane",
            City: "InvoiceTown",
            State: state.ID,
            ZIP: "99999",
            Deleted: false,
        },
    });
    tracker.track("customers", customer.ID);

    const daily = await prisma.dailies.create({
        data: {DriverID: driver.ID, Week: E2E_SEED_WEEK},
    });
    tracker.track("dailies", daily.ID);

    const weekly = await prisma.weeklies.create({
        data: {
            Week: E2E_SEED_WEEK,
            CustomerID: customer.ID,
            LoadTypeID: loadType.ID,
            DeliveryLocationID: deliveryLocation.ID,
            CompanyRate: 17,
            Revenue: 340,
            InvoiceID: null,
        },
    });
    tracker.track("weeklies", weekly.ID);

    const job = await prisma.jobs.create({
        data: {
            DriverID: driver.ID,
            DailyID: daily.ID,
            WeeklyID: weekly.ID,
            CustomerID: customer.ID,
            LoadTypeID: loadType.ID,
            DeliveryLocationID: deliveryLocation.ID,
            TruckingRate: 11,
            MaterialRate: 6,
            DriverRate: 9,
            CompanyRate: 17,
            PaidOut: false,
        },
    });
    tracker.track("jobs", job.ID);

    const load = await prisma.loads.create({
        data: {
            TicketNumber: e2eSeedTicket(),
            DriverID: driver.ID,
            TruckID: truck.ID,
            CustomerID: customer.ID,
            LoadTypeID: loadType.ID,
            DeliveryLocationID: deliveryLocation.ID,
            Week: E2E_SEED_WEEK,
            StartDate: new Date("2099-02-03T12:00:00.000Z"),
            Created: new Date("2099-02-03T12:00:00.000Z"),
            JobID: job.ID,
            Weight: 20,
            TruckRate: 11,
            MaterialRate: 6,
            DriverRate: 9,
            TotalRate: 17,
            TotalAmount: 340,
        },
    });
    tracker.track("loads", load.ID);

    return {
        customerId: customer.ID,
        customerName: customer.Name,
        customerQuery,
        weeklyId: weekly.ID,
        jobId: job.ID,
        loadId: load.ID,
    };
}

export type ComplianceSeed = {
    driverId: number;
    /** Rendered name on compliance pages: "FirstName LastName". */
    driverName: string;
    formId: number;
    formName: string;
    formOptionId: number;
    licenseExpiration: Date;
};

/**
 * Creates a [TEST] W2 driver whose CDL expires in 10 days (shows on
 * /drivers/expiring-soon) plus a W2-visible (not required) form option
 * with an explicit expiration cadence for w2_forms filing flows.
 */
export async function seedComplianceDriver(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
): Promise<ComplianceSeed> {
    const licenseExpiration = new Date();
    licenseExpiration.setDate(licenseExpiration.getDate() + 10);
    licenseExpiration.setHours(12, 0, 0, 0);

    const driver = await prisma.drivers.create({
        data: {
            FirstName: TEST_NAME_PREFIX,
            LastName: `Cmp-${token}`,
            OwnerOperator: false,
            Active: true,
            Deleted: false,
            License: `TCDL-${token}`,
            LicenseExpiration: licenseExpiration,
        },
    });
    tracker.track("drivers", driver.ID);

    const formName = `${TEST_NAME_PREFIX} E2E Form ${token}`;
    const form = await prisma.forms.create({
        data: {Name: `${TEST_NAME_PREFIX}-E2E-${token}`, DisplayName: formName},
    });
    tracker.track("forms", form.ID);

    const formOption = await prisma.formOptions.create({
        data: {
            Form: form.ID,
            W2Visible: true,
            OOVisible: false,
            W2Required: false,
            OORequired: false,
            ExpiryCadence: "EXPIRATION_DATE",
        },
    });
    tracker.track("formOptions", formOption.ID);

    return {
        driverId: driver.ID,
        driverName: `${TEST_NAME_PREFIX} Cmp-${token}`,
        formId: form.ID,
        formName,
        formOptionId: formOption.ID,
        licenseExpiration,
    };
}

export type OpenLegacyJobSeed = {
    driverId: number;
    driverName: string;
    driverQuery: string;
    week: string;
    customerId: number;
    customerName: string;
    /** Distinct search token for the customer autocomplete. */
    customerQuery: string;
    loadTypeId: number;
    loadTypeDescription: string;
    deliveryLocationId: number;
    deliveryLocationDescription: string;
    jobId: number;
};

/**
 * Seeds an open legacy job for the **current calendar week** (matches the Load form
 * default week) so cutover E2E can assert the legacy open-jobs banner. Creates a
 * dedicated [TEST] customer so specs can narrow the open-jobs table to exactly
 * this job via the Customer autocomplete.
 */
export async function seedOpenLegacyJob(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string = String(Date.now() % 100000),
): Promise<OpenLegacyJobSeed> {
    const week = formatDateToWeek(new Date());
    const state = await prisma.states.findFirst({orderBy: {ID: "asc"}});
    const driver = await prisma.drivers.findFirst({where: {Active: true}, orderBy: {ID: "asc"}});
    const deliveryLocation = await prisma.deliveryLocations.findFirst({orderBy: {ID: "asc"}});
    const legacyLoadType = await prisma.loadTypes.findFirst({
        where: {ID: {lt: NEW_LOAD_TYPE_ID_THRESHOLD}, OR: [{Deleted: false}, {Deleted: null}]},
        orderBy: {ID: "asc"},
    });
    if (!state || !driver || !deliveryLocation || !legacyLoadType) {
        throw new Error("Dev DB missing state/driver/DL/legacy load type for open-job seed.");
    }

    const customerQuery = `CutCust-${token}`;
    const customer = await prisma.customers.create({
        data: {
            Name: `${TEST_NAME_PREFIX} ${customerQuery}`,
            Street: "200 Cutover Way",
            City: "LegacyTown",
            State: state.ID,
            ZIP: "99999",
            Deleted: false,
        },
    });
    tracker.track("customers", customer.ID);

    // Rematch resolves the FIRST daily for driver+week; attach the job to that one
    // (creating a duplicate daily would make the seeded job unmatchable on submit).
    let daily = await prisma.dailies.findFirst({
        where: {DriverID: driver.ID, Week: week},
        orderBy: {ID: "asc"},
    });
    if (!daily) {
        daily = await prisma.dailies.create({
            data: {DriverID: driver.ID, Week: week},
        });
        tracker.track("dailies", daily.ID);
    }

    const weekly = await prisma.weeklies.create({
        data: {
            Week: week,
            CustomerID: customer.ID,
            LoadTypeID: legacyLoadType.ID,
            DeliveryLocationID: deliveryLocation.ID,
            CompanyRate: 17,
        },
    });
    tracker.track("weeklies", weekly.ID);

    const job = await prisma.jobs.create({
        data: {
            DriverID: driver.ID,
            DailyID: daily.ID,
            WeeklyID: weekly.ID,
            CustomerID: customer.ID,
            LoadTypeID: legacyLoadType.ID,
            DeliveryLocationID: deliveryLocation.ID,
            TruckingRate: 11,
            MaterialRate: 6,
            DriverRate: 9,
            CompanyRate: 17,
            PaidOut: false,
        },
    });
    tracker.track("jobs", job.ID);

    const driverQuery = driver.FirstName?.slice(0, 4) ?? "Driv";

    return {
        driverId: driver.ID,
        driverName: `${driver.FirstName ?? ""} ${driver.LastName ?? ""}`.trim(),
        driverQuery,
        week,
        customerId: customer.ID,
        customerName: customer.Name,
        customerQuery,
        loadTypeId: legacyLoadType.ID,
        loadTypeDescription: legacyLoadType.Description,
        deliveryLocationId: deliveryLocation.ID,
        deliveryLocationDescription: deliveryLocation.Description,
        jobId: job.ID,
    };
}

export type NewEraCatalogSeed = {
    sourceId: number;
    sourceName: string;
    /** Distinct search token for the Source autocomplete. */
    sourceQuery: string;
    loadTypeId: number;
    loadTypeDescription: string;
    /** Distinct search token for the Load Type autocomplete. */
    loadTypeQuery: string;
};

/**
 * Seeds a [TEST] Source plus a clean load type (ID >= 10000) linked via
 * SourceLoadTypes, so new-era E2E can pick a known post-cutover catalog entry
 * instead of relying on whatever the dev DB happens to contain.
 */
export async function seedNewEraCatalog(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string = String(Date.now() % 100000),
): Promise<NewEraCatalogSeed> {
    const sourceQuery = `CutSrc-${token}`;
    const source = await prisma.sources.create({
        data: {Name: `${TEST_NAME_PREFIX} ${sourceQuery}`, ShortName: `T${token.slice(-4)}`},
    });
    tracker.track("sources", source.ID);

    const maxId = await prisma.loadTypes.aggregate({_max: {ID: true}});
    const loadTypeId = Math.max(NEW_LOAD_TYPE_ID_THRESHOLD, (maxId._max.ID ?? 0) + 1);
    const loadTypeQuery = `CleanType-${token}`;
    const loadType = await prisma.loadTypes.create({
        data: {
            ID: loadTypeId,
            Description: `${TEST_NAME_PREFIX} ${loadTypeQuery}`,
            Deleted: false,
        },
    });
    tracker.track("loadTypes", loadType.ID);

    await prisma.sourceLoadTypes.create({
        data: {SourceID: source.ID, LoadTypeID: loadType.ID, UseCount: 1},
    });

    return {
        sourceId: source.ID,
        sourceName: source.Name,
        sourceQuery,
        loadTypeId: loadType.ID,
        loadTypeDescription: loadType.Description,
        loadTypeQuery,
    };
}

export type MassEditJobSeed = {
    jobId: number;
    loads: Array<{
        id: number;
        ticket: number;
        truckId: number;
        startDate: Date;
    }>;
    anchorTicket: number;
};

/** Multi-load job for mass-edit E2E: same JobID, different trucks and delivery days. */
export async function seedMassEditJob(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
    loadCount = 3,
): Promise<MassEditJobSeed> {
    const state = await prisma.states.findFirst({orderBy: {ID: "asc"}});
    const drivers = await prisma.drivers.findMany({where: {Active: true}, take: 1, orderBy: {ID: "asc"}});
    const trucks = await prisma.trucks.findMany({where: {Active: true}, take: 2, orderBy: {ID: "asc"}});
    const deliveryLocation = await prisma.deliveryLocations.findFirst({orderBy: {ID: "asc"}});
    const loadType = await prisma.loadTypes.findFirst({
        where: {OR: [{Deleted: false}, {Deleted: null}]},
        orderBy: {ID: "asc"},
    });
    if (!state || !drivers[0] || trucks.length < 2 || !deliveryLocation || !loadType) {
        throw new Error("Dev DB missing base fixtures for mass-edit seed.");
    }

    const customer = await prisma.customers.create({
        data: {
            Name: `${TEST_NAME_PREFIX} MassEdit-${token}`,
            Street: "200 Test Lane",
            City: "MassTown",
            State: state.ID,
            ZIP: "99999",
            Deleted: false,
        },
    });
    tracker.track("customers", customer.ID);

    const daily = await prisma.dailies.create({
        data: {DriverID: drivers[0].ID, Week: E2E_SEED_WEEK},
    });
    tracker.track("dailies", daily.ID);

    const weekly = await prisma.weeklies.create({
        data: {
            Week: E2E_SEED_WEEK,
            CustomerID: customer.ID,
            LoadTypeID: loadType.ID,
            DeliveryLocationID: deliveryLocation.ID,
            CompanyRate: 17,
        },
    });
    tracker.track("weeklies", weekly.ID);

    const job = await prisma.jobs.create({
        data: {
            DriverID: drivers[0].ID,
            DailyID: daily.ID,
            WeeklyID: weekly.ID,
            CustomerID: customer.ID,
            LoadTypeID: loadType.ID,
            DeliveryLocationID: deliveryLocation.ID,
            TruckingRate: 11,
            MaterialRate: 6,
            DriverRate: 9,
            CompanyRate: 17,
            PaidOut: false,
        },
    });
    tracker.track("jobs", job.ID);

    const loads: MassEditJobSeed["loads"] = [];
    for (let i = 0; i < loadCount; i++) {
        const ticket = e2eSeedTicket() + i;
        const truckId = i % 2 === 0 ? trucks[0]!.ID : trucks[1]!.ID;
        const startDate = new Date(`2099-02-${String(3 + i).padStart(2, "0")}T12:00:00.000Z`);
        const load = await prisma.loads.create({
            data: {
                TicketNumber: ticket,
                DriverID: drivers[0].ID,
                TruckID: truckId,
                CustomerID: customer.ID,
                LoadTypeID: loadType.ID,
                DeliveryLocationID: deliveryLocation.ID,
                Week: E2E_SEED_WEEK,
                StartDate: startDate,
                Created: new Date("2099-02-03T12:00:00.000Z"),
                JobID: job.ID,
                Weight: 20 + i,
                TruckRate: 11,
                MaterialRate: 6,
                DriverRate: 9,
                TotalRate: 17,
                TotalAmount: (20 + i) * 17,
            },
        });
        tracker.track("loads", load.ID);
        loads.push({id: load.ID, ticket, truckId, startDate});
    }

    return {jobId: job.ID, loads, anchorTicket: loads[0]!.ticket};
}

export type MassEditPaidJobSeed = {
    jobId: number;
    loadId: number;
    ticket: number;
};

export async function seedMassEditPaidJob(
    prisma: PrismaClient,
    tracker: TestRunTracker,
): Promise<MassEditPaidJobSeed> {
    const seed = await seedMassEditJob(prisma, tracker, `paid-${Date.now() % 10000}`, 1);
    await prisma.jobs.update({where: {ID: seed.jobId}, data: {PaidOut: true}});
    return {jobId: seed.jobId, loadId: seed.loads[0]!.id, ticket: seed.loads[0]!.ticket};
}

export type MassEditClosedJobSeed = {
    jobId: number;
    loadId: number;
    ticket: number;
    truckingRevenue: number;
    companyRevenue: number;
};

export async function seedMassEditClosedJob(
    prisma: PrismaClient,
    tracker: TestRunTracker,
): Promise<MassEditClosedJobSeed> {
    const seed = await seedMassEditJob(prisma, tracker, `closed-${Date.now() % 10000}`, 1);
    const truckingRevenue = 400;
    const companyRevenue = 800;
    await prisma.jobs.update({
        where: {ID: seed.jobId},
        data: {TruckingRevenue: truckingRevenue, CompanyRevenue: companyRevenue},
    });
    return {
        jobId: seed.jobId,
        loadId: seed.loads[0]!.id,
        ticket: seed.loads[0]!.ticket,
        truckingRevenue,
        companyRevenue,
    };
}
