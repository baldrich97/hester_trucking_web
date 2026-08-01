import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    assignSourceLoadType,
    buildLoadPutInput,
    createNewEraLoadType,
    createTestContextWithPrisma,
    getBaseEntities,
    putLoad,
    trackLoadGraph,
    TEST_WEEK,
} from "../helpers/dbFixtures";
import {callTrpcMutation, callTrpcQuery} from "../helpers/trpcCaller";
import {nextTestTicket} from "../helpers/testData";
import {buildLoadFilters} from "../../src/server/loadListFilters";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();

const SHARED_RATES = {
    TotalRate: 17,
    TruckRate: 11,
    MaterialRate: 6,
    DriverRate: 9,
};

let weekCounter = 50;
function nextIsolatedWeek(): string {
    weekCounter += 1;
    return `2099-W${String(weekCounter).padStart(2, "0")}`;
}

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

async function addLoadToJob(
    entities: Awaited<ReturnType<typeof getBaseEntities>>,
    jobId: number,
    ticket: number,
    week: string,
    overrides: {
        TruckID?: number;
        StartDate?: Date;
        Weight?: number;
        CustomerID?: number;
    } = {},
) {
    const load = await prisma.loads.create({
        data: {
            TicketNumber: ticket,
            DriverID: entities.driver.ID,
            TruckID: overrides.TruckID ?? entities.truck.ID,
            CustomerID: overrides.CustomerID ?? entities.customer.ID,
            LoadTypeID: entities.legacyLoadType.ID,
            DeliveryLocationID: entities.deliveryLocation.ID,
            Week: week,
            StartDate: overrides.StartDate ?? new Date("2099-01-06T12:00:00.000Z"),
            Created: new Date("2099-01-06T12:00:00.000Z"),
            JobID: jobId,
            Weight: overrides.Weight ?? 20,
            ...SHARED_RATES,
            TotalAmount: SHARED_RATES.TotalRate * (overrides.Weight ?? 20),
        },
    });
    tracker.track("loads", load.ID);
    return load;
}

async function seedJobWithLoads(
    testCtx: Awaited<ReturnType<typeof createTestContextWithPrisma>>,
    entities: Awaited<ReturnType<typeof getBaseEntities>>,
    count: number,
    options?: {multiDay?: boolean; multiTruck?: boolean; week?: string; rates?: typeof SHARED_RATES},
) {
    const week = options?.week ?? nextIsolatedWeek();
    const rates = options?.rates ?? SHARED_RATES;
    const first = await putLoad(
        testCtx,
        buildLoadPutInput(entities, nextTestTicket(200), {...rates, Week: week}),
    );
    await trackLoadGraph(prisma, tracker, first.loadId);
    const jobId = first.jobId;
    const loadIds = [first.loadId];

    for (let i = 1; i < count; i++) {
        const load = await addLoadToJob(entities, jobId, nextTestTicket(200 + i), week, {
            StartDate: options?.multiDay
                ? new Date(`2099-01-${String(6 + i).padStart(2, "0")}T12:00:00.000Z`)
                : undefined,
            TruckID: options?.multiTruck
                ? i % 2 === 0
                    ? entities.truckB.ID
                    : entities.truck.ID
                : undefined,
            Weight: 20 + i,
        });
        loadIds.push(load.ID);
    }
    return {jobId, loadIds, week};
}

function massDataForJob(
    entities: Awaited<ReturnType<typeof getBaseEntities>>,
    week: string,
    ticketSeed: number,
    overrides: Partial<typeof SHARED_RATES & {CustomerID: number; DriverID: number; LoadTypeID: number; SourceID: number}> = {},
) {
    return buildLoadPutInput(entities, nextTestTicket(ticketSeed), {
        ...SHARED_RATES,
        Week: week,
        ...overrides,
    });
}

let ctx: Awaited<ReturnType<typeof createTestContextWithPrisma>>;

beforeAll(async () => {
    ctx = await createTestContextWithPrisma(prisma);
});

describe("mass-edit selection (dev DB via tRPC)", () => {
    it("ME-01: getByJobId returns all loads on same job across different StartDate", async () => {
        const entities = await getBaseEntities(prisma);
        const {jobId} = await seedJobWithLoads(ctx, entities, 3, {multiDay: true});

        const rows = await callTrpcQuery<Array<{ID: number}>>("loads.getByJobId", {jobId}, ctx);
        expect(rows).toHaveLength(3);
    });

    it("ME-02: getByJobId returns all loads with different TruckID", async () => {
        const entities = await getBaseEntities(prisma);
        const {jobId} = await seedJobWithLoads(ctx, entities, 3, {multiTruck: true});

        const rows = await callTrpcQuery<Array<{TruckID: number}>>("loads.getByJobId", {jobId}, ctx);
        expect(rows).toHaveLength(3);
        const truckIds = new Set(rows.map((r) => r.TruckID));
        expect(truckIds.size).toBeGreaterThan(1);
    });

    it("ME-03: getByJobId excludes loads on different JobID", async () => {
        const entities = await getBaseEntities(prisma);
        const a = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(210), {...SHARED_RATES, Week: nextIsolatedWeek()}),
        );
        const b = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(211), {
                ...SHARED_RATES,
                TotalRate: 18,
                Week: nextIsolatedWeek(),
            }),
        );
        await trackLoadGraph(prisma, tracker, a.loadId);
        await trackLoadGraph(prisma, tracker, b.loadId);
        expect(a.jobId).not.toBe(b.jobId);

        const rows = await callTrpcQuery<Array<{ID: number}>>("loads.getByJobId", {jobId: a.jobId}, ctx);
        expect(rows.some((r) => r.ID === b.loadId)).toBe(false);
    });

    it("ME-04: getByJobId excludes deleted loads", async () => {
        const entities = await getBaseEntities(prisma);
        const {jobId, loadIds} = await seedJobWithLoads(ctx, entities, 2);
        await prisma.loads.update({where: {ID: loadIds[1]}, data: {Deleted: true}});

        const rows = await callTrpcQuery<Array<{ID: number}>>("loads.getByJobId", {jobId}, ctx);
        expect(rows).toHaveLength(1);
        expect(rows[0]!.ID).toBe(loadIds[0]);
    });

    it("ME-05: getByJobId returns all 15 loads without pagination cap", async () => {
        const entities = await getBaseEntities(prisma);
        const {jobId, loadIds} = await seedJobWithLoads(ctx, entities, 15);

        const rows = await callTrpcQuery<Array<{ID: number}>>("loads.getByJobId", {jobId}, ctx);
        expect(rows).toHaveLength(15);
        expect(new Set(rows.map((r) => r.ID)).size).toBe(loadIds.length);
    });

    it("ME-06: mass edit fixes CustomerID on all job loads", async () => {
        const entities = await getBaseEntities(prisma);
        const altCustomer = await prisma.customers.findFirst({
            where: {ID: {not: entities.customer.ID}},
            orderBy: {ID: "asc"},
        });
        expect(altCustomer).toBeTruthy();

        const {jobId, loadIds, week} = await seedJobWithLoads(ctx, entities, 2);
        const massData = massDataForJob(entities, week, 220, {CustomerID: altCustomer!.ID});

        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);

        for (const id of loadIds) {
            const row = await prisma.loads.findUnique({where: {ID: id}});
            expect(row?.CustomerID).toBe(altCustomer!.ID);
        }
        const jobIds = new Set(
            (await prisma.loads.findMany({where: {ID: {in: loadIds}}})).map((l) => l.JobID),
        );
        expect(jobIds.size).toBe(1);
        expect([...jobIds][0]).not.toBe(jobId);
    });

    it("ME-07: mass edit fixes DriverID on all job loads", async () => {
        const entities = await getBaseEntities(prisma);
        const {jobId, loadIds, week} = await seedJobWithLoads(ctx, entities, 2);
        const massData = massDataForJob(entities, week, 221, {DriverID: entities.driverB.ID});

        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);

        for (const id of loadIds) {
            const row = await prisma.loads.findUnique({where: {ID: id}});
            expect(row?.DriverID).toBe(entities.driverB.ID);
        }
    });

    it("ME-08: rate change updates TotalRate and rematches all loads to new JobID", async () => {
        const entities = await getBaseEntities(prisma);
        const {jobId, loadIds, week} = await seedJobWithLoads(ctx, entities, 2);
        const newTotalRate = 24;
        const massData = massDataForJob(entities, week, 222, {TotalRate: newTotalRate, TruckRate: 15});

        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);

        const updated = await prisma.loads.findMany({where: {ID: {in: loadIds}}});
        expect(updated.every((l) => l.TotalRate === newTotalRate)).toBe(true);
        expect(new Set(updated.map((l) => l.JobID)).size).toBe(1);
        expect(updated[0]!.JobID).not.toBe(jobId);
    });

    it("ME-09: TruckID unchanged per load after mass edit", async () => {
        const entities = await getBaseEntities(prisma);
        const {loadIds, week} = await seedJobWithLoads(ctx, entities, 3, {multiTruck: true});
        const before = await prisma.loads.findMany({where: {ID: {in: loadIds}}});
        const massData = massDataForJob(entities, week, 223, {TotalRate: 19});

        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);

        const after = await prisma.loads.findMany({where: {ID: {in: loadIds}}});
        for (const row of after) {
            const prev = before.find((b) => b.ID === row.ID);
            expect(row.TruckID).toBe(prev?.TruckID);
        }
    });

    it("ME-10: StartDate unchanged per load after mass edit", async () => {
        const entities = await getBaseEntities(prisma);
        const {loadIds, week} = await seedJobWithLoads(ctx, entities, 3, {multiDay: true});
        const before = await prisma.loads.findMany({where: {ID: {in: loadIds}}});
        const massData = massDataForJob(entities, week, 224, {DriverID: entities.driverB.ID});

        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);

        const after = await prisma.loads.findMany({where: {ID: {in: loadIds}}});
        for (const row of after) {
            const prev = before.find((b) => b.ID === row.ID);
            expect(row.StartDate?.toISOString()).toBe(prev?.StartDate?.toISOString());
        }
    });

    it("ME-11: TicketNumber, Weight, Hours unchanged per load", async () => {
        const entities = await getBaseEntities(prisma);
        const {loadIds, week} = await seedJobWithLoads(ctx, entities, 2);
        const before = await prisma.loads.findMany({where: {ID: {in: loadIds}}});
        const massData = massDataForJob(entities, week, 225, {TotalRate: 21});

        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);

        const after = await prisma.loads.findMany({where: {ID: {in: loadIds}}});
        for (const row of after) {
            const prev = before.find((b) => b.ID === row.ID);
            expect(row.TicketNumber).toBe(prev?.TicketNumber);
            expect(row.Weight).toBe(prev?.Weight);
            expect(row.Hours).toBe(prev?.Hours);
        }
    });

    it("ME-12: TotalAmount recalced per load when TotalRate changes", async () => {
        const entities = await getBaseEntities(prisma);
        const {loadIds, week} = await seedJobWithLoads(ctx, entities, 2);
        const newRate = 22;
        const massData = massDataForJob(entities, week, 226, {TotalRate: newRate});

        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);

        const after = await prisma.loads.findMany({where: {ID: {in: loadIds}}});
        for (const row of after) {
            expect(row.TotalAmount).toBe(Math.round((row.Weight ?? 0) * newRate * 100) / 100);
        }
    });

    it("ME-13: unselected load on same job stays unchanged when excluded from selectedLoads", async () => {
        const entities = await getBaseEntities(prisma);
        const {loadIds, week} = await seedJobWithLoads(ctx, entities, 3);
        const [a, b, c] = loadIds;
        const beforeC = await prisma.loads.findUnique({where: {ID: c!}});

        const massData = massDataForJob(entities, week, 227, {TotalRate: 25});
        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: [a!, b!], data: massData}, ctx);

        const afterC = await prisma.loads.findUnique({where: {ID: c!}});
        expect(afterC?.TotalRate).toBe(beforeC?.TotalRate);
        expect(afterC?.JobID).toBe(beforeC?.JobID);
    });

    it("ME-14: load on different job untouched", async () => {
        const entities = await getBaseEntities(prisma);
        const jobA = await seedJobWithLoads(ctx, entities, 2);
        const other = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(228), {...SHARED_RATES, Week: nextIsolatedWeek()}),
        );
        await trackLoadGraph(prisma, tracker, other.loadId);
        const beforeOther = await prisma.loads.findUnique({where: {ID: other.loadId}});

        const massData = massDataForJob(entities, jobA.week, 229, {TotalRate: 27});
        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: jobA.loadIds, data: massData},
            ctx,
        );

        const afterOther = await prisma.loads.findUnique({where: {ID: other.loadId}});
        expect(afterOther?.TotalRate).toBe(beforeOther?.TotalRate);
        expect(afterOther?.JobID).toBe(beforeOther?.JobID);
    });

    it("ME-15: SourceID rematch on cutover-era load type", async () => {
        const entities = await getBaseEntities(prisma);
        const {loadTypeId, sourceId} = await createNewEraLoadType(prisma, tracker);
        await assignSourceLoadType(prisma, tracker, sourceId, loadTypeId);

        const week = nextIsolatedWeek();
        const first = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(230), {
                ...SHARED_RATES,
                Week: week,
                LoadTypeID: loadTypeId,
                SourceID: sourceId,
            }),
        );
        await trackLoadGraph(prisma, tracker, first.loadId);
        const second = await addLoadToJob(entities, first.jobId, nextTestTicket(231), week, {});
        await prisma.loads.update({
            where: {ID: second.ID},
            data: {LoadTypeID: loadTypeId, SourceID: sourceId},
        });

        const altSource = await prisma.sources.findFirst({
            where: {ID: {not: sourceId}},
            orderBy: {ID: "asc"},
        });
        expect(altSource).toBeTruthy();

        const massData = massDataForJob(entities, week, 232, {
            LoadTypeID: loadTypeId,
            SourceID: altSource!.ID,
        });
        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [first.loadId, second.ID], data: massData},
            ctx,
        );

        const updated = await prisma.loads.findMany({
            where: {ID: {in: [first.loadId, second.ID]}},
        });
        expect(updated.every((l) => l.SourceID === altSource!.ID)).toBe(true);
    });

    it("ME-16: buildLoadFilters with MaterialRate 0 does not match unrelated rates", () => {
        const filters = buildLoadFilters({
            chosenLoad: {MaterialRate: 0, TotalRate: 17},
        });
        expect(filters.MaterialRate).toBeDefined();
        expect((filters.MaterialRate as {gte: number}).gte).toBeCloseTo(-0.001, 3);
    });

    it("ME-17: all selected loads land on same new JobID after rate change", async () => {
        const entities = await getBaseEntities(prisma);
        const {loadIds, week} = await seedJobWithLoads(ctx, entities, 3);
        const massData = massDataForJob(entities, week, 233, {TotalRate: 28});
        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);
        const jobs = await prisma.loads.findMany({where: {ID: {in: loadIds}}, select: {JobID: true}});
        expect(new Set(jobs.map((j) => j.JobID)).size).toBe(1);
    });

    it("ME-18: new weekly CompanyRate matches form TotalRate", async () => {
        const entities = await getBaseEntities(prisma);
        const {loadIds, week} = await seedJobWithLoads(ctx, entities, 2);
        const newRate = 29;
        const massData = massDataForJob(entities, week, 234, {TotalRate: newRate});
        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: loadIds, data: massData}, ctx);
        const load = await prisma.loads.findFirst({where: {ID: {in: loadIds}}});
        const job = await prisma.jobs.findUnique({
            where: {ID: load!.JobID!},
            include: {Weeklies: true},
        });
        expect(job?.CompanyRate).toBe(newRate);
        expect(job?.Weeklies?.CompanyRate).toBe(newRate);
    });

    it("ME-19: original weekly unchanged when other loads still attached", async () => {
        const entities = await getBaseEntities(prisma);
        const {jobId, loadIds, week} = await seedJobWithLoads(ctx, entities, 3);
        const originalWeeklyId = (await prisma.jobs.findUnique({where: {ID: jobId}}))!.WeeklyID;
        const leftBehind = loadIds[2]!;

        const massData = massDataForJob(entities, week, 235, {TotalRate: 30});
        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [loadIds[0]!, loadIds[1]!], data: massData},
            ctx,
        );

        const remaining = await prisma.loads.findUnique({where: {ID: leftBehind}});
        expect(remaining?.JobID).toBe(jobId);
        const weekly = await prisma.weeklies.findUnique({where: {ID: originalWeeklyId}});
        expect(weekly?.CompanyRate).toBe(SHARED_RATES.TotalRate);
    });

    it("ME-20: getByJobId count exceeds composite filter count for multi-day job", async () => {
        const entities = await getBaseEntities(prisma);
        const {jobId, loadIds} = await seedJobWithLoads(ctx, entities, 3, {multiDay: true});
        const anchor = await prisma.loads.findUnique({where: {ID: loadIds[0]}});

        const byJob = await callTrpcQuery<Array<{ID: number}>>("loads.getByJobId", {jobId}, ctx);
        const composite = await callTrpcQuery<Array<{ID: number}>>(
            "loads.getAll",
            {
                customer: anchor!.CustomerID,
                driver: anchor!.DriverID,
                truck: anchor!.TruckID,
                loadType: anchor!.LoadTypeID,
                deliveryLocation: anchor!.DeliveryLocationID,
                search: null,
                orderBy: "ID",
                order: "desc",
                page: 0,
                chosenLoad: anchor,
            },
            ctx,
        );

        expect(byJob.length).toBeGreaterThan(composite.length);
    });
});
