import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {
    createJobGraph,
    createTestContextWithPrisma,
    getBaseEntities,
    nextTestInvoiceNumber,
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

describe("invoice from weekly (dev DB via tRPC)", () => {
    it("invoices.put links weekly and marks loads invoiced", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(70),
            weeklyRevenue: 500,
        });

        await prisma.weeklies.update({
            where: {ID: graph.weeklyId},
            data: {Revenue: 500, InvoiceID: null},
        });

        const invoiceNumber = nextTestInvoiceNumber(20);
        await callTrpcMutation(
            "invoices.put",
            {
                Number: invoiceNumber,
                CustomerID: entities.customer.ID,
                InvoiceDate: new Date("2099-01-20T12:00:00.000Z"),
                TotalAmount: 500,
                Paid: false,
                Printed: false,
                PaymentType: "N/A",
                selected: [String(graph.weeklyId)],
            },
            ctx,
        );

        const invoice = await prisma.invoices.findFirst({
            where: {Number: invoiceNumber},
        });
        expect(invoice).toBeTruthy();
        tracker.track("invoices", invoice!.ID);

        const weekly = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        expect(weekly?.InvoiceID).toBe(invoice!.ID);

        const load = await prisma.loads.findUnique({where: {ID: graph.loadId!}});
        expect(load?.Invoiced).toBe(true);
        expect(load?.InvoiceID).toBe(invoice!.ID);
    });

    it("invoices.postPaid marks invoice paid", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(71),
        });

        const invoice = await prisma.invoices.create({
            data: {
                Number: nextTestInvoiceNumber(21),
                CustomerID: entities.customer.ID,
                InvoiceDate: new Date("2099-01-21T12:00:00.000Z"),
                TotalAmount: 340,
                Paid: false,
                Consolidated: false,
            },
        });
        tracker.track("invoices", invoice.ID);
        await prisma.loads.update({
            where: {ID: graph.loadId!},
            data: {Invoiced: true, InvoiceID: invoice.ID},
        });

        await callTrpcMutation(
            "invoices.postPaid",
            {
                ...invoice,
                PaymentType: "Check",
                selected: [],
            },
            ctx,
        );

        const paid = await prisma.invoices.findUnique({where: {ID: invoice.ID}});
        expect(paid?.Paid).toBe(true);
        expect(paid?.PaymentType).toBe("Check");
        expect(paid?.PaidDate).toBeTruthy();
    });
});
