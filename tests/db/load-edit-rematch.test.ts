import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    buildLoadPutInput,
    createJobGraph,
    createTestContextWithPrisma,
    getBaseEntities,
    putLoad,
    trackLoadGraph,
    TEST_WEEK,
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

async function getJobWeekly(jobId: number) {
    const job = await prisma.jobs.findUnique({
        where: {ID: jobId},
        include: {Weeklies: true, Dailies: true},
    });
    return job;
}

describe("load edit rematch (dev DB via tRPC)", () => {
    it("loads.post company rate change rematches to a new weekly and job", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const ticket = nextTestTicket(60);

        const {loadId, jobId: originalJobId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, ticket, {
                TotalRate: 17,
                TruckRate: 11,
                MaterialRate: 6,
                DriverRate: 9,
            }),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const originalJob = await getJobWeekly(originalJobId);
        expect(originalJob?.Weeklies?.CompanyRate).toBe(17);

        const existing = await prisma.loads.findUnique({where: {ID: loadId}});
        const newTotalRate = 22;
        const newTruckRate = 14;
        const newMaterialRate = 8;
        const newDriverRate = 11;

        await callTrpcMutation(
            "loads.post",
            {
                ...existing!,
                TotalRate: newTotalRate,
                TruckRate: newTruckRate,
                MaterialRate: newMaterialRate,
                DriverRate: newDriverRate,
                TotalAmount: newTotalRate * (existing!.Weight ?? 20),
            },
            ctx,
        );

        const updated = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(updated?.TotalRate).toBe(newTotalRate);
        expect(updated?.JobID).not.toBe(originalJobId);

        const newJob = await getJobWeekly(updated!.JobID!);
        expect(newJob?.CompanyRate).toBe(newTotalRate);
        expect(newJob?.TruckingRate).toBe(newTruckRate);
        expect(newJob?.Weeklies?.CompanyRate).toBe(newTotalRate);
        expect(newJob?.Weeklies?.ID).not.toBe(originalJob!.WeeklyID);
        expect(newJob?.Dailies?.Week).toBe(TEST_WEEK);

        // Original job/weekly left intact for any other loads still attached.
        const untouchedJob = await prisma.jobs.findUnique({where: {ID: originalJobId}});
        expect(untouchedJob?.CompanyRate).toBe(17);

        await trackLoadGraph(prisma, tracker, loadId);
    });

    it("loads.post_mass_edit company rate change rematches all selected loads onto one new weekly/job", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        const a = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(61), {
                TotalRate: 17,
                TruckRate: 11,
                MaterialRate: 6,
                DriverRate: 9,
            }),
        );
        const b = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(62), {
                TotalRate: 17,
                TruckRate: 11,
                MaterialRate: 6,
                DriverRate: 9,
            }),
        );
        await trackLoadGraph(prisma, tracker, a.loadId);
        await trackLoadGraph(prisma, tracker, b.loadId);

        expect(a.jobId).toBe(b.jobId);
        const originalWeeklyId = (await getJobWeekly(a.jobId))!.WeeklyID;

        const newTotalRate = 24;
        const massData = buildLoadPutInput(entities, nextTestTicket(61), {
            TotalRate: newTotalRate,
            TruckRate: 15,
            MaterialRate: 9,
            DriverRate: 12,
        });

        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [a.loadId, b.loadId], data: massData},
            ctx,
        );

        const updatedA = await prisma.loads.findUnique({where: {ID: a.loadId}});
        const updatedB = await prisma.loads.findUnique({where: {ID: b.loadId}});

        expect(updatedA?.TotalRate).toBe(newTotalRate);
        expect(updatedB?.TotalRate).toBe(newTotalRate);
        expect(updatedA?.JobID).toBe(updatedB?.JobID);
        expect(updatedA?.JobID).not.toBe(a.jobId);

        const newJob = await getJobWeekly(updatedA!.JobID!);
        expect(newJob?.CompanyRate).toBe(newTotalRate);
        expect(newJob?.Weeklies?.CompanyRate).toBe(newTotalRate);
        expect(newJob?.Weeklies?.ID).not.toBe(originalWeeklyId);

        await trackLoadGraph(prisma, tracker, a.loadId);
    });

    it("loads.post_mass_edit rate change does not move loads that were not selected", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        const sharedRates = {
            TotalRate: 17,
            TruckRate: 11,
            MaterialRate: 6,
            DriverRate: 9,
        };

        const a = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(63), sharedRates));
        const b = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(64), sharedRates));
        const c = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(65), sharedRates));
        await trackLoadGraph(prisma, tracker, a.loadId);
        await trackLoadGraph(prisma, tracker, b.loadId);
        await trackLoadGraph(prisma, tracker, c.loadId);

        expect(a.jobId).toBe(b.jobId);
        expect(b.jobId).toBe(c.jobId);

        const massData = buildLoadPutInput(entities, nextTestTicket(63), {
            ...sharedRates,
            TotalRate: 26,
            TruckRate: 16,
        });

        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [a.loadId, b.loadId], data: massData},
            ctx,
        );

        const updatedA = await prisma.loads.findUnique({where: {ID: a.loadId}});
        const updatedB = await prisma.loads.findUnique({where: {ID: b.loadId}});
        const untouchedC = await prisma.loads.findUnique({where: {ID: c.loadId}});

        expect(updatedA?.JobID).toBe(updatedB?.JobID);
        expect(untouchedC?.JobID).toBe(c.jobId);
        expect(untouchedC?.TotalRate).toBe(17);

        await trackLoadGraph(prisma, tracker, a.loadId);
    });

    it("loads.put and loads.post both run rematch on create and update", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const ticket = nextTestTicket(66);

        const {loadId, jobId: createJobId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, ticket, {TotalRate: 17}),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const afterCreate = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(afterCreate?.JobID).toBe(createJobId);

        const existing = await prisma.loads.findUnique({where: {ID: loadId}});
        await callTrpcMutation(
            "loads.post",
            {
                ...existing!,
                TotalRate: 19,
                TotalAmount: 19 * (existing!.Weight ?? 20),
            },
            ctx,
        );

        const afterUpdate = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(afterUpdate?.JobID).not.toBe(createJobId);
        expect(afterUpdate?.TotalRate).toBe(19);

        const newJob = await getJobWeekly(afterUpdate!.JobID!);
        expect(newJob?.CompanyRate).toBe(19);
        expect(newJob?.Weeklies?.CompanyRate).toBe(19);

        await trackLoadGraph(prisma, tracker, loadId);
    });

    it("loads.post_mass_edit on multi-day job preserves TruckID and StartDate per load", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const sharedRates = {TotalRate: 17, TruckRate: 11, MaterialRate: 6, DriverRate: 9};
        const week = "2099-W87";

        const first = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(70), {...sharedRates, Week: week}),
        );
        await trackLoadGraph(prisma, tracker, first.loadId);

        const second = await prisma.loads.create({
            data: {
                TicketNumber: nextTestTicket(71),
                DriverID: entities.driver.ID,
                TruckID: entities.truckB.ID,
                CustomerID: entities.customer.ID,
                LoadTypeID: entities.legacyLoadType.ID,
                DeliveryLocationID: entities.deliveryLocation.ID,
                Week: week,
                StartDate: new Date("2099-01-10T12:00:00.000Z"),
                Created: new Date("2099-01-10T12:00:00.000Z"),
                JobID: first.jobId,
                Weight: 22,
                ...sharedRates,
                TotalAmount: sharedRates.TotalRate * 22,
            },
        });
        tracker.track("loads", second.ID);

        const byJob = await callTrpcQuery<Array<{ID: number}>>(
            "loads.getByJobId",
            {jobId: first.jobId},
            ctx,
        );
        const ourIds = new Set([first.loadId, second.ID]);
        expect(byJob.filter((row) => ourIds.has(row.ID))).toHaveLength(2);

        const before = await prisma.loads.findMany({where: {ID: {in: [first.loadId, second.ID]}}});
        const massData = buildLoadPutInput(entities, nextTestTicket(72), {
            ...sharedRates,
            Week: week,
            DriverID: entities.driverB.ID,
        });
        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [first.loadId, second.ID], data: massData},
            ctx,
        );

        const after = await prisma.loads.findMany({where: {ID: {in: [first.loadId, second.ID]}}});
        for (const row of after) {
            const prev = before.find((b) => b.ID === row.ID);
            expect(row.TruckID).toBe(prev?.TruckID);
            expect(row.StartDate?.toISOString()).toBe(prev?.StartDate?.toISOString());
        }
    });

    it("loads.post_mass_edit on closed non-paid job succeeds with frozen revenues", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadId, jobId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(73), {TotalRate: 17}),
        );
        await trackLoadGraph(prisma, tracker, loadId);
        const job = await prisma.jobs.findUnique({where: {ID: jobId}});
        await callTrpcMutation(
            "jobs.postClosed",
            {...job!, TruckingRevenue: 300, CompanyRevenue: 600},
            ctx,
        );
        const snapshot = await prisma.jobs.findUnique({where: {ID: jobId}});

        const massData = buildLoadPutInput(entities, nextTestTicket(74), {TotalRate: 18});
        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [loadId], data: massData},
            ctx,
        );

        const afterJob = await prisma.jobs.findUnique({where: {ID: jobId}});
        expect(afterJob?.TruckingRevenue).toBe(snapshot?.TruckingRevenue);
        expect(afterJob?.CompanyRevenue).toBe(snapshot?.CompanyRevenue);
    });

    it("loads.post_mass_edit on paid job is rejected before DB writes", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(75),
            paidOut: true,
        });
        const before = await prisma.loads.findUnique({where: {ID: graph.loadId!}});
        const massData = buildLoadPutInput(entities, nextTestTicket(76), {TotalRate: 20});

        await expect(
            callTrpcMutation(
                "loads.post_mass_edit",
                {selectedLoads: [graph.loadId!], data: massData},
                ctx,
            ),
        ).rejects.toThrow(/paid out/i);

        const after = await prisma.loads.findUnique({where: {ID: graph.loadId!}});
        expect(after?.TotalRate).toBe(before?.TotalRate);
    });
});
