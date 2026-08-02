import type {PrismaClient} from "@prisma/client";
import {NEW_LOAD_TYPE_ID_THRESHOLD} from "../../src/config/sourcesCutover";
import {callTrpcMutation, callTrpcQuery, createTestContext, type TestContext} from "./trpcCaller";
import {nextTestTicket, TEST_NAME_PREFIX} from "./testData";
import type {TestRunTracker} from "./testRunTracker";

/** Isolated week for DB tests — unlikely to collide with production data. */
export const TEST_WEEK = "2099-W01";

/** Second isolated week for dailies/weeklies sheet tests. */
export const TEST_WEEK_SHEETS = "2099-W02";

export type JobGraph = {
    dailyId: number;
    weeklyId: number;
    jobId: number;
    loadId?: number;
    week: string;
};

export type BaseEntities = {
    driver: {ID: number; FirstName: string; LastName: string};
    driverB: {ID: number; FirstName: string; LastName: string};
    truck: {ID: number};
    truckB: {ID: number};
    customer: {ID: number; Name: string};
    deliveryLocation: {ID: number};
    legacyLoadType: {ID: number; Description: string};
};

export async function getBaseEntities(prisma: PrismaClient): Promise<BaseEntities> {
    const drivers = await prisma.drivers.findMany({
        where: {Active: true},
        take: 2,
        orderBy: {ID: "asc"},
    });
    const trucks = await prisma.trucks.findMany({
        where: {Active: true},
        take: 2,
        orderBy: {ID: "asc"},
    });
    const customer = await prisma.customers.findFirst({orderBy: {ID: "asc"}});
    const deliveryLocation = await prisma.deliveryLocations.findFirst({orderBy: {ID: "asc"}});
    const legacyLoadType = await prisma.loadTypes.findFirst({
        where: {ID: {lt: NEW_LOAD_TYPE_ID_THRESHOLD}, OR: [{Deleted: false}, {Deleted: null}]},
        orderBy: {ID: "asc"},
    });

    if (drivers.length < 2 || trucks.length < 2 || !customer || !deliveryLocation || !legacyLoadType) {
        throw new Error("Dev DB missing base fixtures (2 active drivers/trucks, customer, DL, legacy load type).");
    }

    return {
        driver: drivers[0]!,
        driverB: drivers[1]!,
        truck: trucks[0]!,
        truckB: trucks[1]!,
        customer,
        deliveryLocation,
        legacyLoadType,
    };
}

export type LoadRates = {
    TruckRate: number;
    MaterialRate: number;
    DriverRate: number;
    TotalRate: number;
};

export const DEFAULT_LOAD_RATES: LoadRates = {
    TruckRate: 11,
    MaterialRate: 6,
    DriverRate: 9,
    TotalRate: 17,
};

export function buildLoadPutInput(
    entities: BaseEntities,
    ticket: number,
    overrides: Partial<{
        DriverID: number;
        TruckID: number;
        CustomerID: number;
        LoadTypeID: number;
        DeliveryLocationID: number;
        Week: string;
        Weight: number;
        SourceID: number | null;
    }> & Partial<LoadRates> = {},
) {
    const rates = {...DEFAULT_LOAD_RATES, ...overrides};
    const weight = overrides.Weight ?? 20;
    return {
        TicketNumber: ticket,
        DriverID: entities.driver.ID,
        TruckID: entities.truck.ID,
        CustomerID: entities.customer.ID,
        LoadTypeID: entities.legacyLoadType.ID,
        DeliveryLocationID: entities.deliveryLocation.ID,
        Week: TEST_WEEK,
        StartDate: new Date("2099-01-06T12:00:00.000Z"),
        Created: new Date("2099-01-06T12:00:00.000Z"),
        Weight: weight,
        TotalAmount: rates.TotalRate * weight,
        ...rates,
        ...overrides,
    };
}

export async function createTestContextWithPrisma(prisma: PrismaClient): Promise<TestContext> {
    return createTestContext(prisma);
}

export async function putLoad(
    ctx: TestContext,
    input: ReturnType<typeof buildLoadPutInput>,
): Promise<{loadId: number; jobId: number; data: {ID: number; JobID: number}}> {
    const result = await callTrpcMutation<{data: {ID: number; JobID: number}}>("loads.put", input, ctx);
    return {loadId: result.data.ID, jobId: result.data.JobID, data: result.data};
}

export async function trackJobGraph(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    jobId: number,
): Promise<void> {
    const job = await prisma.jobs.findUnique({where: {ID: jobId}});
    if (!job) return;
    tracker.track("jobs", job.ID);
    tracker.track("dailies", job.DailyID);
    tracker.track("weeklies", job.WeeklyID);
}

export async function trackLoadGraph(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    loadId: number,
): Promise<void> {
    const load = await prisma.loads.findUnique({where: {ID: loadId}});
    if (!load) return;
    tracker.track("loads", load.ID);
    if (load.JobID) {
        await trackJobGraph(prisma, tracker, load.JobID);
    }
}

export async function createJobGraph(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    options: {
        week?: string;
        driverId: number;
        customerId: number;
        loadTypeId: number;
        deliveryLocationId: number;
        truckId?: number;
        ticket?: number;
        companyRate?: number;
        weeklyRevenue?: number;
        rates?: Partial<LoadRates>;
        createLoad?: boolean;
        paidOut?: boolean;
    },
): Promise<JobGraph> {
    const week = options.week ?? TEST_WEEK;
    const rates = {...DEFAULT_LOAD_RATES, ...options.rates};

    const daily = await prisma.dailies.create({
        data: {DriverID: options.driverId, Week: week},
    });
    tracker.track("dailies", daily.ID);

    const weekly = await prisma.weeklies.create({
        data: {
            Week: week,
            CustomerID: options.customerId,
            LoadTypeID: options.loadTypeId,
            DeliveryLocationID: options.deliveryLocationId,
            CompanyRate: options.companyRate ?? rates.TotalRate,
            ...(options.weeklyRevenue !== undefined ? {Revenue: options.weeklyRevenue} : {}),
        },
    });
    tracker.track("weeklies", weekly.ID);

    const job = await prisma.jobs.create({
        data: {
            DriverID: options.driverId,
            DailyID: daily.ID,
            WeeklyID: weekly.ID,
            CustomerID: options.customerId,
            LoadTypeID: options.loadTypeId,
            DeliveryLocationID: options.deliveryLocationId,
            TruckingRate: rates.TruckRate,
            MaterialRate: rates.MaterialRate,
            DriverRate: rates.DriverRate,
            CompanyRate: rates.TotalRate,
            PaidOut: options.paidOut ?? false,
        },
    });
    tracker.track("jobs", job.ID);

    let loadId: number | undefined;
    if (options.createLoad !== false && options.truckId) {
        const load = await prisma.loads.create({
            data: {
                TicketNumber: options.ticket ?? nextTestTicket(99),
                DriverID: options.driverId,
                TruckID: options.truckId,
                CustomerID: options.customerId,
                LoadTypeID: options.loadTypeId,
                DeliveryLocationID: options.deliveryLocationId,
                Week: week,
                StartDate: new Date("2099-01-06T12:00:00.000Z"),
                Created: new Date("2099-01-06T12:00:00.000Z"),
                JobID: job.ID,
                Weight: 18,
                TruckRate: rates.TruckRate,
                MaterialRate: rates.MaterialRate,
                DriverRate: rates.DriverRate,
                TotalRate: rates.TotalRate,
                TotalAmount: rates.TotalRate * 18,
            },
        });
        tracker.track("loads", load.ID);
        loadId = load.ID;
    }

    return {dailyId: daily.ID, weeklyId: weekly.ID, jobId: job.ID, loadId, week};
}

export type OpenLegacyJobSeed = {
    driverId: number;
    driverName: string;
    week: string;
    customerId: number;
    customerName: string;
    loadTypeId: number;
    loadTypeDescription: string;
    deliveryLocationId: number;
    jobId: number;
};

/** Open legacy job with a recent ticket for the current calendar week — drives cutover UI tests. */
export async function seedOpenLegacyJob(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    options?: {week?: string; createLoad?: boolean},
): Promise<OpenLegacyJobSeed> {
    const {formatDateToWeek} = await import("../../src/utils/UtilityFunctions");
    const entities = await getBaseEntities(prisma);
    const week = options?.week ?? formatDateToWeek(new Date());
    const graph = await createJobGraph(prisma, tracker, {
        week,
        driverId: entities.driver.ID,
        customerId: entities.customer.ID,
        loadTypeId: entities.legacyLoadType.ID,
        deliveryLocationId: entities.deliveryLocation.ID,
        truckId: entities.truck.ID,
        createLoad: options?.createLoad ?? true,
    });
    return {
        driverId: entities.driver.ID,
        driverName: `${entities.driver.FirstName} ${entities.driver.LastName}`.trim(),
        week,
        customerId: entities.customer.ID,
        customerName: entities.customer.Name,
        loadTypeId: entities.legacyLoadType.ID,
        loadTypeDescription: entities.legacyLoadType.Description,
        deliveryLocationId: entities.deliveryLocation.ID,
        jobId: graph.jobId,
    };
}

export async function assignSourceLoadType(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    sourceId: number,
    loadTypeId: number,
): Promise<void> {
    await prisma.sourceLoadTypes.upsert({
        where: {SourceID_LoadTypeID: {SourceID: sourceId, LoadTypeID: loadTypeId}},
        create: {SourceID: sourceId, LoadTypeID: loadTypeId, UseCount: 1},
        update: {UseCount: {increment: 1}},
    });
    tracker.track("sources", sourceId);
    tracker.track("loadTypes", loadTypeId);
}

export async function createNewEraLoadType(
    prisma: PrismaClient,
    tracker: TestRunTracker,
): Promise<{loadTypeId: number; sourceId: number}> {
    const source = await prisma.sources.create({
        data: {Name: `${TEST_NAME_PREFIX} Source ${Date.now()}`, ShortName: `T-${Date.now() % 10000}`},
    });
    tracker.track("sources", source.ID);

    const maxId = await prisma.loadTypes.aggregate({_max: {ID: true}});
    const loadTypeId = Math.max(NEW_LOAD_TYPE_ID_THRESHOLD, (maxId._max.ID ?? 0) + 1);
    await prisma.loadTypes.create({
        data: {ID: loadTypeId, Description: `${TEST_NAME_PREFIX} TYPE ${loadTypeId}`, Deleted: false},
    });
    tracker.track("loadTypes", loadTypeId);

    return {loadTypeId, sourceId: source.ID};
}

export async function queryLoadsPage(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<{rows: {ID: number}[]; count: number}> {
    return callTrpcQuery("loads.getAllPage", input, ctx);
}

export function nextUniqueTicket(seed: number): number {
    return nextTestTicket(seed);
}

/** Invoice numbers in 999800+ range for filter tests. */
export function nextTestInvoiceNumber(seed: number): number {
    return 999800 + seed;
}

export async function createTestCustomer(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
): Promise<{ID: number; Name: string}> {
    const state = await prisma.states.findFirst({orderBy: {ID: "asc"}});
    if (!state) throw new Error("Dev DB missing states row.");
    const customer = await prisma.customers.create({
        data: {
            Name: `${TEST_NAME_PREFIX} Cust-${token}`,
            Street: "100 Test Lane",
            City: "FilterTown",
            State: state.ID,
            ZIP: "99999",
            Deleted: false,
        },
    });
    tracker.track("customers", customer.ID);
    return customer;
}

export async function createTestSource(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
): Promise<{ID: number; Name: string}> {
    const source = await prisma.sources.create({
        data: {
            Name: `${TEST_NAME_PREFIX} Source-${token}`,
            ShortName: `T-${token}`,
        },
    });
    tracker.track("sources", source.ID);
    return source;
}

export async function createTestInvoice(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    data: {
        Number: number;
        CustomerID: number;
        TotalAmount: number;
        Paid?: boolean;
        Consolidated?: boolean;
    },
): Promise<{ID: number}> {
    const invoice = await prisma.invoices.create({
        data: {
            Number: data.Number,
            CustomerID: data.CustomerID,
            InvoiceDate: new Date("2099-01-15T12:00:00.000Z"),
            TotalAmount: data.TotalAmount,
            Paid: data.Paid ?? false,
            Consolidated: data.Consolidated ?? false,
        },
    });
    tracker.track("invoices", invoice.ID);
    return invoice;
}

export async function linkLoadToInvoice(
    prisma: PrismaClient,
    loadId: number,
    invoiceId: number,
): Promise<void> {
    await prisma.loads.update({
        where: {ID: loadId},
        data: {InvoiceID: invoiceId, Invoiced: true},
    });
}

export async function queryCustomersPage(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<{rows: {ID: number}[]; count: number}> {
    return callTrpcQuery("customers.searchPage", input, ctx);
}

export async function querySourcesPage(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<{rows: {ID: number}[]; count: number}> {
    return callTrpcQuery("sources.searchPage", input, ctx);
}

export async function queryInvoicesPage(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<{rows: {ID: number}[]; count: number}> {
    return callTrpcQuery("invoices.getAllPage", input, ctx);
}

export async function createTestDriver(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
    options?: {active?: boolean; ownerOperator?: boolean},
): Promise<{ID: number; LastName: string}> {
    const driver = await prisma.drivers.create({
        data: {
            FirstName: TEST_NAME_PREFIX,
            LastName: `Drv-${token}`,
            OwnerOperator: options?.ownerOperator ?? false,
            Active: options?.active ?? true,
            Deleted: false,
        },
    });
    tracker.track("drivers", driver.ID);
    return driver;
}

export async function createTestTruck(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
    options?: {active?: boolean},
): Promise<{ID: number; Name: string}> {
    const truck = await prisma.trucks.create({
        data: {
            Name: `${TEST_NAME_PREFIX} Truck-${token}`,
            Active: options?.active ?? true,
            Deleted: false,
        },
    });
    tracker.track("trucks", truck.ID);
    return truck;
}

export async function linkTruckDriven(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    driverId: number,
    truckId: number,
): Promise<void> {
    const row = await prisma.trucksDriven.create({
        data: {
            DriverID: driverId,
            TruckID: truckId,
            DateDriven: new Date("2099-01-06T12:00:00.000Z"),
        },
    });
    tracker.track("trucksDriven", row.ID);
}

export async function createTestPaystub(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    driverId: number,
    token: string,
): Promise<{ID: number}> {
    const paystub = await prisma.payStubs.create({
        data: {
            DriverID: driverId,
            Created: new Date("2099-01-10T12:00:00.000Z"),
            CheckNumber: `CHK-${token}`,
            Gross: 1000,
            Percentage: 0.25,
            NetTotal: 750,
            TakeHome: 750,
            Deductions: 0,
            Additions: 0,
        },
    });
    tracker.track("payStubs", paystub.ID);
    return paystub;
}

export async function createTestLoadTypeForSearch(
    prisma: PrismaClient,
    tracker: TestRunTracker,
    token: string,
): Promise<{ID: number; Description: string | null}> {
    const loadType = await prisma.loadTypes.create({
        data: {
            Description: `${TEST_NAME_PREFIX} LT-${token}`,
            Deleted: false,
        },
    });
    tracker.track("loadTypes", loadType.ID);
    return loadType;
}

export async function queryDriversSearch(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<Array<{ID: number; Group?: string}>> {
    return callTrpcQuery("drivers.search", input, ctx);
}

export async function queryTrucksSearch(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<Array<{ID: number; Group?: string}>> {
    return callTrpcQuery("trucks.search", input, ctx);
}

export async function queryPaystubsSearch(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<Array<{ID: number; DriverID?: number}>> {
    return callTrpcQuery("paystubs.search", input, ctx);
}

export async function queryLoadtypesPage(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<{rows: {ID: number}[]; count: number}> {
    return callTrpcQuery("loadtypes.searchPage", input, ctx);
}

export async function queryDailiesByWeek(
    ctx: TestContext,
    input: Record<string, unknown>,
): Promise<Array<{ID: number}>> {
    return callTrpcQuery("dailies.getByWeek", input, ctx);
}

export async function queryWeekliesByWeek(
    ctx: TestContext,
    week: string,
): Promise<Array<{ID: number}>> {
    return callTrpcQuery("weeklies.getByWeek", {week}, ctx);
}

async function getNotPrintedPageForId(
    prisma: PrismaClient,
    kind: "dailies" | "weeklies",
    targetId: number,
): Promise<number> {
    const countRows =
        kind === "dailies"
            ? await prisma.$queryRaw<Array<{count: bigint | number}>>`
                SELECT COUNT(DISTINCT d.ID) AS count
                FROM Dailies d
                WHERE (
                    d.LastPrinted IS NULL
                    OR d.ID IN (
                        SELECT d1.ID
                        FROM Dailies d1
                                 JOIN Jobs j ON d1.ID = j.DailyID
                                 JOIN Loads l ON j.ID = l.JobID
                        WHERE d.LastPrinted IS NOT NULL
                          AND l.Created > d1.LastPrinted
                    )
                )
                  AND d.ID < ${targetId}
            `
            : await prisma.$queryRaw<Array<{count: bigint | number}>>`
                SELECT COUNT(DISTINCT w.ID) AS count
                FROM Weeklies w
                WHERE (
                    w.LastPrinted IS NULL
                    OR w.ID IN (
                        SELECT w1.ID
                        FROM Weeklies w1
                                 JOIN Jobs j ON w1.ID = j.WeeklyID
                                 JOIN Loads l ON j.ID = l.JobID
                        WHERE w.LastPrinted IS NOT NULL
                          AND l.Created > w1.LastPrinted
                    )
                )
                  AND w.ID < ${targetId}
            `;

    const preceding = Number(countRows[0]?.count ?? 0);
    return Math.floor(preceding / 10) + 1;
}

/** Resolve the paginated not-printed page for a row ID, then assert tRPC returns it. */
export async function findInNotPrintedPages(
    ctx: TestContext,
    prisma: PrismaClient,
    procedure: "dailies.getNotPrinted" | "weeklies.getNotPrinted",
    targetId: number,
): Promise<boolean> {
    const kind = procedure.startsWith("dailies") ? "dailies" : "weeklies";
    const page = await getNotPrintedPageForId(prisma, kind, targetId);
    const result = await callTrpcQuery<{data: {ID: number}[]}>(
        procedure,
        {page},
        ctx,
    );
    return result.data.some((row) => row.ID === targetId);
}
