import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {
    createTestContextWithPrisma,
    createTestInvoice,
    getBaseEntities,
    nextTestInvoiceNumber,
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

describe("consolidated invoices (dev DB via tRPC)", () => {
    it("invoices.putConsolidated links child invoices to a consolidated parent", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        const childA = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(10),
            CustomerID: entities.customer.ID,
            TotalAmount: 400,
        });
        const childB = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(11),
            CustomerID: entities.customer.ID,
            TotalAmount: 250,
        });

        const result = await callTrpcMutation<boolean>(
            "invoices.putConsolidated",
            {ids: [childA.ID, childB.ID]},
            ctx,
        );
        expect(result).toBe(true);

        const updatedA = await prisma.invoices.findUnique({where: {ID: childA.ID}});
        const updatedB = await prisma.invoices.findUnique({where: {ID: childB.ID}});
        expect(updatedA?.ConsolidatedID).toBeTruthy();
        expect(updatedA?.ConsolidatedID).toBe(updatedB?.ConsolidatedID);

        const parent = await prisma.invoices.findUnique({
            where: {ID: updatedA!.ConsolidatedID!},
        });
        expect(parent?.Consolidated).toBe(true);
        expect(parent?.CustomerID).toBe(entities.customer.ID);
        expect(parent?.TotalAmount).toBe(650);
        tracker.track("invoices", parent!.ID);
    });
});
