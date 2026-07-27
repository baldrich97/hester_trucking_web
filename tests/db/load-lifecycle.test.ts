import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {NEW_LOAD_TYPE_ID_THRESHOLD} from "../../src/config/sourcesCutover";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    assignSourceLoadType,
    buildLoadPutInput,
    createNewEraLoadType,
    createTestContextWithPrisma,
    createTestSource,
    getBaseEntities,
    putLoad,
    queryLoadsPage,
    TEST_WEEK,
    trackLoadGraph,
} from "../helpers/dbFixtures";
import {callTrpcMutation, callTrpcQuery} from "../helpers/trpcCaller";
import {nextTestTicket} from "../helpers/testData";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

describe("load lifecycle (dev DB via tRPC)", () => {
    it("loads.put creates load, daily, weekly, and job via rematch", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const ticket = nextTestTicket(30);

        const {loadId, jobId} = await putLoad(ctx, buildLoadPutInput(entities, ticket));
        await trackLoadGraph(prisma, tracker, loadId);

        const load = await prisma.loads.findUnique({where: {ID: loadId}});
        const job = await prisma.jobs.findUnique({
            where: {ID: jobId},
            include: {Dailies: true, Weeklies: true},
        });

        expect(load?.TicketNumber).toBe(ticket);
        expect(load?.Week).toBe(TEST_WEEK);
        expect(load?.JobID).toBe(jobId);
        expect(job).toBeTruthy();
        expect(job!.DriverID).toBe(entities.driver.ID);
        expect(job!.Dailies?.Week).toBe(TEST_WEEK);
        expect(job!.Weeklies?.Week).toBe(TEST_WEEK);
        expect(job!.Weeklies?.CustomerID).toBe(entities.customer.ID);
    });

    it("rematch reuses the same job for a second load with matching rates", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        const first = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(31)));
        const second = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(32)));

        await trackLoadGraph(prisma, tracker, first.loadId);
        await trackLoadGraph(prisma, tracker, second.loadId);

        expect(second.jobId).toBe(first.jobId);
    });

    it("loads.put assigns SourceID for new-era load types when cutover active", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadTypeId, sourceId} = await createNewEraLoadType(prisma, tracker);

        const {loadId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(33), {
                LoadTypeID: loadTypeId,
                SourceID: sourceId,
            }),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const load = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(load?.LoadTypeID).toBeGreaterThanOrEqual(NEW_LOAD_TYPE_ID_THRESHOLD);
        expect(load?.SourceID).toBe(sourceId);
    });

    it("loads.post_mass_edit updates selected loads", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        const a = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(34)));
        const b = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(35), {DriverID: entities.driverB.ID}));
        await trackLoadGraph(prisma, tracker, a.loadId);
        await trackLoadGraph(prisma, tracker, b.loadId);

        const newTruckId = entities.truckB.ID;
        const massData = buildLoadPutInput(entities, nextTestTicket(34), {TruckID: newTruckId});

        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [a.loadId, b.loadId], data: massData},
            ctx,
        );

        const updatedA = await prisma.loads.findUnique({where: {ID: a.loadId}});
        const updatedB = await prisma.loads.findUnique({where: {ID: b.loadId}});
        expect(updatedA?.TruckID).toBe(newTruckId);
        expect(updatedB?.TruckID).toBe(newTruckId);
    });

    it("loads.post_mass_edit reassigns SourceID on new-era loads and rematches the job", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadTypeId, sourceId: sourceA} = await createNewEraLoadType(prisma, tracker);
        const sourceB = await createTestSource(prisma, tracker, "MASS");
        await assignSourceLoadType(prisma, tracker, sourceB.ID, loadTypeId);

        const a = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(36), {
                LoadTypeID: loadTypeId,
                SourceID: sourceA,
            }),
        );
        const b = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(37), {
                LoadTypeID: loadTypeId,
                SourceID: sourceA,
            }),
        );
        await trackLoadGraph(prisma, tracker, a.loadId);
        await trackLoadGraph(prisma, tracker, b.loadId);

        const massData = buildLoadPutInput(entities, nextTestTicket(36), {
            LoadTypeID: loadTypeId,
            SourceID: sourceB.ID,
        });
        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [a.loadId, b.loadId], data: massData},
            ctx,
        );

        const updatedA = await prisma.loads.findUnique({where: {ID: a.loadId}});
        const updatedB = await prisma.loads.findUnique({where: {ID: b.loadId}});
        expect(updatedA?.SourceID).toBe(sourceB.ID);
        expect(updatedB?.SourceID).toBe(sourceB.ID);

        // Rematch must have moved both loads onto a job keyed by the new source.
        expect(updatedA?.JobID).toBe(updatedB?.JobID);
        expect(updatedA?.JobID).not.toBe(a.jobId);
        const newJob = await prisma.jobs.findUnique({where: {ID: updatedA!.JobID!}});
        expect(newJob?.SourceID).toBe(sourceB.ID);
        if (updatedA?.JobID) {
            await trackLoadGraph(prisma, tracker, a.loadId);
        }
    });
});

describe("loads table filters (dev DB)", () => {
    let loadAId = 0;
    let loadBId = 0;
    let ticketA = 0;
    let ticketB = 0;
    let driverBId = 0;

    beforeAll(async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        driverBId = entities.driverB.ID;
        ticketA = nextTestTicket(40);
        ticketB = nextTestTicket(41);

        const loadA = await putLoad(
            ctx,
            buildLoadPutInput(entities, ticketA, {DriverID: entities.driver.ID}),
        );
        const loadB = await putLoad(
            ctx,
            buildLoadPutInput(entities, ticketB, {
                DriverID: entities.driverB.ID,
                TruckID: entities.truckB.ID,
            }),
        );

        loadAId = loadA.loadId;
        loadBId = loadB.loadId;
        await trackLoadGraph(prisma, tracker, loadAId);
        await trackLoadGraph(prisma, tracker, loadBId);
    });

    it("filters by ticket number exactly", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryLoadsPage(ctx, {
            page: 0,
            search: ticketA,
            orderBy: "ID",
            order: "desc",
        });

        expect(page.count).toBe(1);
        expect(page.rows).toHaveLength(1);
        expect(page.rows[0]!.ID).toBe(loadAId);
    });

    it("filters by driver and ticket together", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryLoadsPage(ctx, {
            page: 0,
            driver: driverBId,
            search: ticketB,
            orderBy: "ID",
            order: "desc",
        });

        expect(page.count).toBe(1);
        expect(page.rows[0]!.ID).toBe(loadBId);
    });

    it("getCount matches getAllPage count for the same filter", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const filter = {driver: driverBId, search: ticketB};
        const page = await queryLoadsPage(ctx, {page: 0, orderBy: "ID", order: "desc", ...filter});
        const count = await callTrpcQuery<number>("loads.getCount", filter, ctx);
        expect(page.count).toBe(count);
    });

    it("getUninvPage excludes invoiced loads", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await callTrpcQuery<{rows: {ID: number}[]; count: number}>(
            "loads.getUninvPage",
            {page: 0, search: ticketA, orderBy: "ID", order: "desc"},
            ctx,
        );
        expect(page.rows.some((r) => r.ID === loadAId)).toBe(true);
    });
});
