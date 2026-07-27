import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {
    assignSourceLoadType,
    buildLoadPutInput,
    createJobGraph,
    createNewEraLoadType,
    createTestContextWithPrisma,
    getBaseEntities,
    putLoad,
    TEST_WEEK,
    trackLoadGraph,
} from "../helpers/dbFixtures";
import {callTrpcMutation, callTrpcQuery} from "../helpers/trpcCaller";
import {nextTestTicket} from "../helpers/testData";
import {TestRunTracker} from "../helpers/testRunTracker";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();
const LEGACY_WEEK = "2099-W10";

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

describe("load update workflows (dev DB via tRPC)", () => {
    it("loads.post updates an existing load", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const ticket = nextTestTicket(50);

        const {loadId} = await putLoad(ctx, buildLoadPutInput(entities, ticket));
        await trackLoadGraph(prisma, tracker, loadId);

        const existing = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(existing).toBeTruthy();

        const newWeight = 25;
        const newTruckId = entities.truckB.ID;
        await callTrpcMutation(
            "loads.post",
            {
                ...existing!,
                TruckID: newTruckId,
                Weight: newWeight,
                TotalAmount: existing!.TotalRate * newWeight,
            },
            ctx,
        );

        const updated = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(updated?.TruckID).toBe(newTruckId);
        expect(updated?.Weight).toBe(newWeight);
    });

    it("loads.put_duplicate_checker returns existing load for duplicate ticket", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const ticket = nextTestTicket(51);

        const {loadId} = await putLoad(ctx, buildLoadPutInput(entities, ticket));
        await trackLoadGraph(prisma, tracker, loadId);

        const duplicate = await callTrpcMutation<{ID: number} | false>(
            "loads.put_duplicate_checker",
            buildLoadPutInput(entities, ticket),
            ctx,
        );
        expect(duplicate).not.toBe(false);
        expect((duplicate as {ID: number}).ID).toBe(loadId);

        const unique = await callTrpcMutation<{ID: number} | false>(
            "loads.put_duplicate_checker",
            buildLoadPutInput(entities, nextTestTicket(52)),
            ctx,
        );
        expect(unique).toBe(false);
    });

    it("loads.post_duplicate_checker ignores the current load ID", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const ticket = nextTestTicket(53);

        const {loadId} = await putLoad(ctx, buildLoadPutInput(entities, ticket));
        await trackLoadGraph(prisma, tracker, loadId);
        const load = await prisma.loads.findUnique({where: {ID: loadId}});

        const selfCheck = await callTrpcMutation<{ID: number} | false>(
            "loads.post_duplicate_checker",
            load!,
            ctx,
        );
        expect(selfCheck).toBe(false);

        const other = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(54)));
        await trackLoadGraph(prisma, tracker, other.loadId);

        const conflict = await callTrpcMutation<{ID: number} | false>(
            "loads.post_duplicate_checker",
            {...load!, TicketNumber: (await prisma.loads.findUnique({where: {ID: other.loadId}}))!.TicketNumber},
            ctx,
        );
        expect(conflict).not.toBe(false);
        expect((conflict as {ID: number}).ID).toBe(other.loadId);
    });

    it("loads.openLegacyJobs returns open legacy jobs for driver/week", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const ticket = nextTestTicket(55);

        const {loadId, jobId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, ticket, {Week: LEGACY_WEEK}),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const jobs = await callTrpcQuery<
            Array<{JobID: number; CustomerID: number; DeliveryLocationID: number}>
        >(
            "loads.openLegacyJobs",
            {
                DriverID: entities.driver.ID,
                Week: LEGACY_WEEK,
                CustomerID: entities.customer.ID,
                DeliveryLocationID: entities.deliveryLocation.ID,
            },
            ctx,
        );

        expect(jobs.map((row) => row.JobID)).toContain(jobId);
    });

    it("paid-out jobs are skipped during rematch and get a new job", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        const first = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(56)));
        await trackLoadGraph(prisma, tracker, first.loadId);

        await prisma.jobs.update({
            where: {ID: first.jobId},
            data: {PaidOut: true},
        });

        const second = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(57)));
        await trackLoadGraph(prisma, tracker, second.loadId);

        expect(second.jobId).not.toBe(first.jobId);

        const paidJob = await prisma.jobs.findUnique({where: {ID: first.jobId}});
        const newJob = await prisma.jobs.findUnique({where: {ID: second.jobId}});
        expect(paidJob?.PaidOut).toBe(true);
        expect(newJob?.PaidOut).not.toBe(true);
    });
});

describe("weekly and job mutations (dev DB via tRPC)", () => {
    it("weeklies.post cascades SourceID to jobs and loads", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadTypeId, sourceId: sourceA} = await createNewEraLoadType(prisma, tracker);
        const sourceB = await prisma.sources.create({
            data: {Name: "[TEST] Cascade Source", ShortName: "T-CASC"},
        });
        tracker.track("sources", sourceB.ID);
        await assignSourceLoadType(prisma, tracker, sourceA, loadTypeId);
        await assignSourceLoadType(prisma, tracker, sourceB.ID, loadTypeId);

        const {loadId, jobId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(58), {
                LoadTypeID: loadTypeId,
                SourceID: sourceA,
            }),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const job = await prisma.jobs.findUnique({where: {ID: jobId}});
        const weekly = await prisma.weeklies.findUnique({where: {ID: job!.WeeklyID}});

        await callTrpcMutation(
            "weeklies.post",
            {
                ...weekly!,
                SourceID: sourceB.ID,
            },
            ctx,
        );

        const updatedWeekly = await prisma.weeklies.findUnique({where: {ID: weekly!.ID}});
        const updatedJob = await prisma.jobs.findUnique({where: {ID: jobId}});
        const updatedLoad = await prisma.loads.findUnique({where: {ID: loadId}});

        expect(updatedWeekly?.SourceID).toBe(sourceB.ID);
        expect(updatedJob?.SourceID).toBe(sourceB.ID);
        expect(updatedLoad?.SourceID).toBe(sourceB.ID);
    });

    it("jobs.postClosed persists trucking and company revenue", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            week: TEST_WEEK,
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(59),
        });

        const job = await prisma.jobs.findUnique({where: {ID: graph.jobId}});
        const truckingRevenue = 450;
        const companyRevenue = 850;

        await callTrpcMutation(
            "jobs.postClosed",
            {
                ...job!,
                TruckingRevenue: truckingRevenue,
                CompanyRevenue: companyRevenue,
            },
            ctx,
        );

        const updated = await prisma.jobs.findUnique({where: {ID: graph.jobId}});
        expect(updated?.TruckingRevenue).toBe(truckingRevenue);
        expect(updated?.CompanyRevenue).toBe(companyRevenue);
    });

    it("jobs.postPaid marks a job as paid out", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            week: TEST_WEEK,
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(60),
        });

        const job = await prisma.jobs.findUnique({where: {ID: graph.jobId}});
        await callTrpcMutation(
            "jobs.postPaid",
            {
                ...job!,
                PaidOut: true,
            },
            ctx,
        );

        const updated = await prisma.jobs.findUnique({where: {ID: graph.jobId}});
        expect(updated?.PaidOut).toBe(true);
    });
});
