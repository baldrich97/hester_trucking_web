import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {
    createJobGraph,
    createTestInvoice,
    createTestSource,
    getBaseEntities,
    linkLoadToInvoice,
    nextTestInvoiceNumber,
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

describe("invoice lifecycle (dev DB)", () => {
    it("creates invoice and marks loads invoiced", async () => {
        const entities = await getBaseEntities(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(10),
        });
        expect(graph.loadId).toBeTruthy();

        const invoice = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(1),
            CustomerID: entities.customer.ID,
            TotalAmount: 360,
        });

        await prisma.weeklies.update({
            where: {ID: graph.weeklyId},
            data: {InvoiceID: invoice.ID},
        });
        await linkLoadToInvoice(prisma, graph.loadId!, invoice.ID);

        const updatedLoad = await prisma.loads.findUnique({where: {ID: graph.loadId}});
        expect(updatedLoad?.Invoiced).toBe(true);
        expect(updatedLoad?.InvoiceID).toBe(invoice.ID);

        const updatedWeekly = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        expect(updatedWeekly?.InvoiceID).toBe(invoice.ID);
    });
});
