import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    buildLoadPutInput,
    createTestContextWithPrisma,
    createTestInvoice,
    getBaseEntities,
    linkLoadToInvoice,
    putLoad,
    trackLoadGraph,
} from "../helpers/dbFixtures";
import {callTrpcMutation} from "../helpers/trpcCaller";
import {nextTestTicket} from "../helpers/testData";
import {
    CLOSED_JOB_REMATCH_WARNING,
    DAILY_PRINTED_WARNING,
} from "../../src/constants/loadWarnings";

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

describe("load warning payloads (dev DB via tRPC)", () => {
    it("LW-DB1: loads.put returns daily printed warning when daily was printed", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {jobId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(801), RATES));
        const job = await prisma.jobs.findUnique({where: {ID: jobId}});
        await prisma.dailies.update({
            where: {ID: job!.DailyID},
            data: {LastPrinted: new Date()},
        });

        const result = await callTrpcMutation<{data: {ID: number}; warnings: string[]}>(
            "loads.put",
            buildLoadPutInput(entities, nextTestTicket(802), RATES),
            ctx,
        );
        await trackLoadGraph(prisma, tracker, result.data.ID);

        expect(result.warnings).toContain(DAILY_PRINTED_WARNING);
        expect(result.warnings?.length).toBeGreaterThanOrEqual(3);
    });

    it("LW-DB2: loads.put returns closed-job rematch warning when matching a closed job", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const first = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(803), RATES));
        await trackLoadGraph(prisma, tracker, first.loadId);
        const closedJob = await prisma.jobs.findUnique({where: {ID: first.jobId}});
        await callTrpcMutation(
            "jobs.postClosed",
            {...closedJob!, TruckingRevenue: 200, CompanyRevenue: 400},
            ctx,
        );

        const second = await callTrpcMutation<{data: {ID: number}; warnings: string[]}>(
            "loads.put",
            buildLoadPutInput(entities, nextTestTicket(804), RATES),
            ctx,
        );
        await trackLoadGraph(prisma, tracker, second.data.ID);

        expect(second.warnings).toContain(CLOSED_JOB_REMATCH_WARNING);
    });

    it("LW-DB3: loads.post returns closed-job rematch warning when edit rematches to closed job", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const first = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(805), RATES));
        await trackLoadGraph(prisma, tracker, first.loadId);
        const closedJob = await prisma.jobs.findUnique({where: {ID: first.jobId}});
        await callTrpcMutation(
            "jobs.postClosed",
            {...closedJob!, TruckingRevenue: 200, CompanyRevenue: 400},
            ctx,
        );

        const second = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(806), {
                TotalRate: 20,
                TruckRate: 13,
                MaterialRate: 7,
                DriverRate: 10,
            }),
        );
        await trackLoadGraph(prisma, tracker, second.loadId);

        const load = await prisma.loads.findUnique({where: {ID: second.loadId}});
        const result = await callTrpcMutation<{data: {ID: number}; warnings: string[]}>(
            "loads.post",
            {
                ...load!,
                TotalRate: RATES.TotalRate,
                TruckRate: RATES.TruckRate,
                MaterialRate: RATES.MaterialRate,
                DriverRate: RATES.DriverRate,
                TotalAmount: RATES.TotalRate! * (load!.Weight ?? 20),
            },
            ctx,
        );

        expect(result.warnings).toContain(CLOSED_JOB_REMATCH_WARNING);
    });

    it("LW-DB4: post_mass_edit returns warnings array shape on success", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(807), RATES));
        await trackLoadGraph(prisma, tracker, loadId);
        const load = await prisma.loads.findUnique({where: {ID: loadId}});

        const result = await callTrpcMutation<{ok: boolean; warnings: string[]}>(
            "loads.post_mass_edit",
            {
                selectedLoads: [loadId],
                data: {
                    ...load!,
                    TruckRate: 12,
                },
            },
            ctx,
        );

        expect(result.ok).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("LW-DB5: post_mass_edit on paid job rejects with paid-out message", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadId, jobId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(808), RATES));
        await trackLoadGraph(prisma, tracker, loadId);
        await prisma.jobs.update({where: {ID: jobId}, data: {PaidOut: true}});
        const load = await prisma.loads.findUnique({where: {ID: loadId}});

        await expect(
            callTrpcMutation(
                "loads.post_mass_edit",
                {selectedLoads: [loadId], data: {...load!, TruckRate: 13}},
                ctx,
            ),
        ).rejects.toThrow(/paid out/i);
    });

    it("LW-DB6: post_mass_edit on invoiced load rejects with invoiced message", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadId} = await putLoad(ctx, buildLoadPutInput(entities, nextTestTicket(809), RATES));
        await trackLoadGraph(prisma, tracker, loadId);
        const invoice = await createTestInvoice(prisma, tracker, {
            Number: nextTestTicket(9809),
            CustomerID: entities.customer.ID,
            TotalAmount: 340,
        });
        await linkLoadToInvoice(prisma, loadId, invoice.ID);
        const load = await prisma.loads.findUnique({where: {ID: loadId}});

        await expect(
            callTrpcMutation(
                "loads.post_mass_edit",
                {selectedLoads: [loadId], data: {...load!, TruckRate: 13}},
                ctx,
            ),
        ).rejects.toThrow(/invoiced/i);
    });
});
