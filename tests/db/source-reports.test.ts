import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    assignSourceLoadType,
    buildLoadPutInput,
    createNewEraLoadType,
    createTestContextWithPrisma,
    createTestSource,
    getBaseEntities,
    putLoad,
    trackLoadGraph,
} from "../helpers/dbFixtures";
import {callTrpcQuery} from "../helpers/trpcCaller";
import {nextTestTicket} from "../helpers/testData";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();

const LOAD_DATE = new Date("2099-01-06T12:00:00.000Z");

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

describe("source reports (dev DB via tRPC)", () => {
    it("sourceAudit includes a sourced load in range and excludes out-of-range / wrong source", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadTypeId, sourceId} = await createNewEraLoadType(prisma, tracker);
        await assignSourceLoadType(prisma, tracker, sourceId, loadTypeId);

        const ticket = nextTestTicket(90);
        const {loadId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, ticket, {
                LoadTypeID: loadTypeId,
                SourceID: sourceId,
                StartDate: LOAD_DATE,
            }),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const inRange = await callTrpcQuery<{
            rows: Array<{TicketNumber: number}>;
            summary: {totalLoads: number};
        }>(
            "reports.sourceAudit",
            {
                sourceId,
                startDate: new Date("2099-01-01"),
                endDate: new Date("2099-01-31"),
            },
            ctx,
        );
        expect(inRange.summary.totalLoads).toBe(1);
        expect(inRange.rows.some((r) => r.TicketNumber === ticket)).toBe(true);

        const beforeLoad = await callTrpcQuery<{summary: {totalLoads: number}; rows: unknown[]}>(
            "reports.sourceAudit",
            {
                sourceId,
                startDate: new Date("2099-01-01"),
                endDate: new Date("2099-01-05"),
            },
            ctx,
        );
        expect(beforeLoad.summary.totalLoads).toBe(0);
        expect(beforeLoad.rows).toEqual([]);

        const otherSource = await createTestSource(prisma, tracker, "report-other");
        const wrongSource = await callTrpcQuery<{summary: {totalLoads: number}}>(
            "reports.sourceAudit",
            {
                sourceId: otherSource.ID,
                startDate: new Date("2099-01-01"),
                endDate: new Date("2099-01-31"),
            },
            ctx,
        );
        expect(wrongSource.summary.totalLoads).toBe(0);
    });

    it("customerAudit includes a load for the customer in range and excludes out-of-range", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadTypeId, sourceId} = await createNewEraLoadType(prisma, tracker);
        await assignSourceLoadType(prisma, tracker, sourceId, loadTypeId);

        const ticket = nextTestTicket(91);
        const {loadId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, ticket, {
                LoadTypeID: loadTypeId,
                SourceID: sourceId,
                CustomerID: entities.customer.ID,
                StartDate: LOAD_DATE,
            }),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const inRange = await callTrpcQuery<{
            rows: Array<{TicketNumber: number}>;
            summary: {totalLoads: number};
        }>(
            "reports.customerAudit",
            {
                customerId: entities.customer.ID,
                startDate: new Date("2099-01-01"),
                endDate: new Date("2099-01-31"),
            },
            ctx,
        );
        expect(inRange.summary.totalLoads).toBeGreaterThanOrEqual(1);
        expect(inRange.rows.some((r) => r.TicketNumber === ticket)).toBe(true);

        const outOfRange = await callTrpcQuery<{
            summary: {totalLoads: number};
            rows: Array<{TicketNumber: number}>;
        }>(
            "reports.customerAudit",
            {
                customerId: entities.customer.ID,
                startDate: new Date("2099-02-01"),
                endDate: new Date("2099-02-28"),
            },
            ctx,
        );
        expect(outOfRange.rows.some((r) => r.TicketNumber === ticket)).toBe(false);
    });
});
