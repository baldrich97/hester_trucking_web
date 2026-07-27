import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {
    createJobGraph,
    createTestContextWithPrisma,
    getBaseEntities,
    nextUniqueTicket,
} from "../helpers/dbFixtures";
import {callTrpcMutation} from "../helpers/trpcCaller";
import {TestRunTracker} from "../helpers/testRunTracker";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

describe("sheet close flags (dev DB via tRPC)", () => {
    it("weeklies.postClosed saves revenue on an open weekly", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(80),
        });

        const weekly = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        const revenue = 425;

        await callTrpcMutation(
            "weeklies.postClosed",
            {
                ...weekly!,
                Revenue: revenue,
            },
            ctx,
        );

        const updated = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        expect(updated?.Revenue).toBe(revenue);
    });
});
