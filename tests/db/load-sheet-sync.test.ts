import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    buildLoadPutInput,
    createJobGraph,
    createTestContextWithPrisma,
    createTestInvoice,
    getBaseEntities,
    linkLoadToInvoice,
    putLoad,
    TEST_WEEK,
    trackLoadGraph,
} from "../helpers/dbFixtures";
import {callTrpcMutation, callTrpcQuery} from "../helpers/trpcCaller";
import {nextTestTicket} from "../helpers/testData";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();

const RATES = {TotalRate: 17, TruckRate: 11, MaterialRate: 6, DriverRate: 9};

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

async function closeJob(ctx: Awaited<ReturnType<typeof createTestContextWithPrisma>>, jobId: number) {
    const job = await prisma.jobs.findUnique({where: {ID: jobId}});
    await callTrpcMutation(
        "jobs.postClosed",
        {...job!, TruckingRevenue: 400, CompanyRevenue: 800},
        ctx,
    );
    return job!;
}

describe("load sheet sync and paid-out guards (dev DB via tRPC)", () => {
    it("PO-01: mass edit on paid job rejects with BAD_REQUEST", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(300),
            paidOut: true,
        });
        expect(graph.loadId).toBeTruthy();

        const before = await prisma.loads.findUnique({where: {ID: graph.loadId!}});
        const massData = buildLoadPutInput(entities, nextTestTicket(301), {...RATES, TotalRate: 20});

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

    it("PO-02: loads.post on load attached to paid job rejects", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(302),
            paidOut: true,
        });
        const load = await prisma.loads.findUnique({where: {ID: graph.loadId!}});

        await expect(
            callTrpcMutation(
                "loads.post",
                {...load!, TotalRate: 19, TotalAmount: 19 * (load!.Weight ?? 18)},
                ctx,
            ),
        ).rejects.toThrow(/paid out/i);
    });

    it("PO-03: loads.post update on paid job rejects (edit block)", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(303),
            paidOut: true,
        });
        const load = await prisma.loads.findUnique({where: {ID: graph.loadId!}});

        await expect(
            callTrpcMutation("loads.post", {...load!, Weight: 25}, ctx),
        ).rejects.toThrow(/paid out/i);
    });

    it("PO-04: loads.put create with same rates as paid job succeeds on new unpaid job", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(304),
            paidOut: true,
        });

        const created = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(305), RATES));
        await trackLoadGraph(prisma, tracker, created.loadId);
        const job = await prisma.jobs.findUnique({where: {ID: created.jobId}});
        expect(job?.PaidOut).toBe(false);
    });

    it("JC-01 / JC-02: mass edit on closed job succeeds and revenues stay frozen", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadId, jobId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(310), RATES));
        await trackLoadGraph(prisma, tracker, loadId);
        const closed = await closeJob(ctx, jobId);
        const snapshot = await prisma.jobs.findUnique({where: {ID: jobId}});

        const massData = buildLoadPutInput(entities, nextTestTicket(311), {...RATES, TotalRate: 21});
        await callTrpcMutation("loads.post_mass_edit", {selectedLoads: [loadId], data: massData}, ctx);

        const after = await prisma.jobs.findUnique({where: {ID: closed.ID}});
        expect(after?.TruckingRevenue).toBe(snapshot?.TruckingRevenue);
        expect(after?.CompanyRevenue).toBe(snapshot?.CompanyRevenue);
    });

    it("JC-03: loads.post on closed non-paid job succeeds with frozen revenues", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadId, jobId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(312), RATES));
        await trackLoadGraph(prisma, tracker, loadId);
        await closeJob(ctx, jobId);
        const snapshot = await prisma.jobs.findUnique({where: {ID: jobId}});

        const load = await prisma.loads.findUnique({where: {ID: loadId}});
        await callTrpcMutation(
            "loads.post",
            {...load!, DriverID: entities.driverB.ID},
            ctx,
        );

        const after = await prisma.jobs.findUnique({where: {ID: jobId}});
        expect(after?.TruckingRevenue).toBe(snapshot?.TruckingRevenue);
        expect(after?.CompanyRevenue).toBe(snapshot?.CompanyRevenue);
    });

    it("JC-04: rate change rematches away from closed job; closed revenues frozen", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadId, jobId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(313), RATES));
        await trackLoadGraph(prisma, tracker, loadId);
        await closeJob(ctx, jobId);
        const snapshot = await prisma.jobs.findUnique({where: {ID: jobId}});

        const load = await prisma.loads.findUnique({where: {ID: loadId}});
        await callTrpcMutation(
            "loads.post",
            {...load!, TotalRate: 23, TotalAmount: 23 * (load!.Weight ?? 20)},
            ctx,
        );

        const updated = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(updated?.JobID).not.toBe(jobId);
        const closed = await prisma.jobs.findUnique({where: {ID: jobId}});
        expect(closed?.TruckingRevenue).toBe(snapshot?.TruckingRevenue);
        expect(closed?.CompanyRevenue).toBe(snapshot?.CompanyRevenue);
    });

    it("WC-01 / WC-02: mass edit under closed weekly succeeds; Revenue frozen", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(320),
            weeklyRevenue: 900,
        });
        const weeklyBefore = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        await prisma.weeklies.update({
            where: {ID: graph.weeklyId},
            data: {TotalWeight: 36},
        });

        const massData = buildLoadPutInput(entities, nextTestTicket(321), {...RATES, TotalRate: 20});
        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [graph.loadId!], data: massData},
            ctx,
        );

        const weeklyAfter = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        expect(weeklyAfter?.Revenue).toBe(weeklyBefore?.Revenue);
        expect(weeklyAfter?.TotalWeight).toBe(36);
    });

    it("WC-03: rate change rematches to new open weekly; closed weekly Revenue frozen", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(322),
            weeklyRevenue: 700,
        });
        const closedWeeklyId = graph.weeklyId;
        const load = await prisma.loads.findUnique({where: {ID: graph.loadId!}});

        await callTrpcMutation(
            "loads.post",
            {...load!, TotalRate: 26, TotalAmount: 26 * (load!.Weight ?? 18)},
            ctx,
        );

        const updated = await prisma.loads.findUnique({where: {ID: graph.loadId!}});
        const newJob = await prisma.jobs.findUnique({
            where: {ID: updated!.JobID!},
            include: {Weeklies: true},
        });
        expect(newJob?.WeeklyID).not.toBe(closedWeeklyId);
        expect(newJob?.Weeklies?.Revenue).toBeNull();

        const closedWeekly = await prisma.weeklies.findUnique({where: {ID: closedWeeklyId}});
        expect(closedWeekly?.Revenue).toBe(700);
    });

    it("WI-01: invoiced load mass edit is rejected", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(330),
        });
        const invoice = await createTestInvoice(prisma, tracker, {
            Number: nextTestTicket(331),
            CustomerID: entities.customer.ID,
            TotalAmount: 500,
        });
        await prisma.weeklies.update({
            where: {ID: graph.weeklyId},
            data: {InvoiceID: invoice.ID, Revenue: 500, TotalWeight: 18},
        });
        await linkLoadToInvoice(prisma, graph.loadId!, invoice.ID);
        const snapshot = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});

        const massData = buildLoadPutInput(entities, nextTestTicket(332), {...RATES, TotalRate: 22});
        await expect(
            callTrpcMutation(
                "loads.post_mass_edit",
                {selectedLoads: [graph.loadId!], data: massData},
                ctx,
            ),
        ).rejects.toThrow(/invoiced/i);

        const after = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        expect(after?.Revenue).toBe(snapshot?.Revenue);
        expect(after?.TotalWeight).toBe(snapshot?.TotalWeight);
        expect(after?.InvoiceID).toBe(snapshot?.InvoiceID);
    });

    it("OS-01: mass edit recalcs TotalAmount per load", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const a = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(340), RATES));
        const b = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(341), RATES));
        await trackLoadGraph(prisma, tracker, a.loadId);
        await trackLoadGraph(prisma, tracker, b.loadId);

        const massData = buildLoadPutInput(entities, nextTestTicket(342), {...RATES, TotalRate: 20});
        await callTrpcMutation(
            "loads.post_mass_edit",
            {selectedLoads: [a.loadId, b.loadId], data: massData},
            ctx,
        );

        const rows = await prisma.loads.findMany({where: {ID: {in: [a.loadId, b.loadId]}}});
        for (const row of rows) {
            expect(row.TotalAmount).toBe(Math.round((row.Weight ?? 0) * 20 * 100) / 100);
        }
    });

    it("OS-02 / OS-03 / OS-04: open weekly TotalWeight sync; job revenues stay null", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            week: "2099-W88",
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(343),
        });

        const load = await prisma.loads.findUnique({where: {ID: graph.loadId!}});
        await callTrpcMutation(
            "loads.post",
            {...load!, Weight: 30, TotalAmount: 30 * (load!.TotalRate ?? 17)},
            ctx,
        );

        const updatedLoad = await prisma.loads.findUnique({where: {ID: graph.loadId!}});
        expect(updatedLoad?.Weight).toBe(30);

        const jobAfter = await prisma.jobs.findUnique({where: {ID: updatedLoad!.JobID!}});
        const weekly = await prisma.weeklies.findUnique({where: {ID: jobAfter!.WeeklyID}});
        expect(weekly?.Revenue).toBeNull();
        expect(weekly?.TotalWeight).toBe(30);

        expect(jobAfter?.TruckingRevenue).toBeNull();
        expect(jobAfter?.CompanyRevenue).toBeNull();
    });

    it("OS-05: rematch decreases source open weekly TotalWeight", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const week = "2099-W89";
        const graph = await createJobGraph(prisma, tracker, {
            week,
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextTestTicket(344),
            rates: RATES,
        });
        const stayLoad = await prisma.loads.create({
            data: {
                TicketNumber: nextTestTicket(345),
                DriverID: entities.driver.ID,
                TruckID: entities.truck.ID,
                CustomerID: entities.customer.ID,
                LoadTypeID: entities.legacyLoadType.ID,
                DeliveryLocationID: entities.deliveryLocation.ID,
                Week: week,
                StartDate: new Date("2099-01-06T12:00:00.000Z"),
                Created: new Date("2099-01-06T12:00:00.000Z"),
                JobID: graph.jobId,
                Weight: 20,
                ...RATES,
                TotalAmount: 20 * RATES.TotalRate,
            },
        });
        tracker.track("loads", stayLoad.ID);

        const moveLoad = await prisma.loads.findUnique({where: {ID: graph.loadId!}});
        await callTrpcMutation(
            "loads.post",
            {...moveLoad!, TotalRate: 31, TotalAmount: 31 * (moveLoad!.Weight ?? 18)},
            ctx,
        );

        const weekly = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        const remaining = await prisma.loads.findUnique({where: {ID: stayLoad.ID}});
        expect(weekly?.TotalWeight).toBe(remaining?.Weight ?? 0);
    });

    it("LP-01: loads.put create when daily LastPrinted set succeeds with warning", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {jobId, loadId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(350), RATES));
        await trackLoadGraph(prisma, tracker, loadId);
        const job = await prisma.jobs.findUnique({where: {ID: jobId}});
        await prisma.dailies.update({
            where: {ID: job!.DailyID},
            data: {LastPrinted: new Date()},
        });

        const result = await callTrpcMutation<{data: {ID: number}; warnings: string[]}>(
            "loads.put",
            buildLoadPutInput(entities, nextTestTicket(351), RATES),
            ctx,
        );
        await trackLoadGraph(prisma, tracker, result.data.ID);
        expect(result.data.ID).toBeGreaterThan(0);
        expect(result.warnings?.length ?? 0).toBeGreaterThan(0);
    });

    it("LP-02: loads.post and mass edit on printed daily are not blocked", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadId, jobId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(352), RATES));
        await trackLoadGraph(prisma, tracker, loadId);
        const job = await prisma.jobs.findUnique({where: {ID: jobId}});
        await prisma.dailies.update({
            where: {ID: job!.DailyID},
            data: {LastPrinted: new Date()},
        });

        const load = await prisma.loads.findUnique({where: {ID: loadId}});
        await expect(
            callTrpcMutation("loads.post", {...load!, DriverID: entities.driverB.ID}, ctx),
        ).resolves.toBeDefined();

        const massData = buildLoadPutInput(entities, nextTestTicket(353), {...RATES, TotalRate: 18});
        await expect(
            callTrpcMutation("loads.post_mass_edit", {selectedLoads: [loadId], data: massData}, ctx),
        ).resolves.toBe(true);
    });
});
