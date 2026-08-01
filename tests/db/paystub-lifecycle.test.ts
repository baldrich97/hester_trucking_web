import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TEST_NAME_PREFIX} from "../helpers/testData";
import {
    createJobGraph,
    getBaseEntities,
    nextUniqueTicket,
} from "../helpers/dbFixtures";
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

describe("paystub lifecycle (dev DB)", () => {
    it("creates paystub and marks job PaidOut", async () => {
        const entities = await getBaseEntities(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(20),
            paidOut: false,
        });

        const paystub = await prisma.payStubs.create({
            data: {
                Created: new Date(),
                DriverID: entities.driver.ID,
                CheckNumber: `${TEST_NAME_PREFIX}-PS`,
                Gross: 500,
                Percentage: 0.25,
                NetTotal: 375,
                TakeHome: 375,
                Notes: `${TEST_NAME_PREFIX} paystub lifecycle`,
            },
        });
        tracker.track("payStubs", paystub.ID);

        await prisma.jobs.update({
            where: {ID: graph.jobId},
            data: {PayStubID: paystub.ID, PaidOut: true},
        });

        const updatedJob = await prisma.jobs.findUnique({where: {ID: graph.jobId}});
        expect(updatedJob?.PaidOut).toBe(true);
        expect(updatedJob?.PayStubID).toBe(paystub.ID);
    });
});
