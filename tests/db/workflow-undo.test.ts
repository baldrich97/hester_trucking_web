import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TEST_NAME_PREFIX} from "../helpers/testData";
import {
    createJobGraph,
    createTestContextWithPrisma,
    createTestInvoice,
    getBaseEntities,
    linkLoadToInvoice,
    nextTestInvoiceNumber,
    nextUniqueTicket,
} from "../helpers/dbFixtures";
import {callTrpcMutation, callTrpcQuery} from "../helpers/trpcCaller";
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

describe("workflow undo (dev DB via tRPC)", () => {
    it("invoices.delete unlinks loads/weeklies via updateMany then removes the invoice", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(90),
            weeklyRevenue: 500,
        });

        const invoice = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(90),
            CustomerID: entities.customer.ID,
            TotalAmount: 0.5,
        });
        await prisma.weeklies.update({
            where: {ID: graph.weeklyId},
            data: {InvoiceID: invoice.ID, Revenue: 500},
        });
        await linkLoadToInvoice(prisma, graph.loadId!, invoice.ID);

        await callTrpcMutation("invoices.delete", {ID: invoice.ID}, ctx);

        expect(await prisma.invoices.findUnique({where: {ID: invoice.ID}})).toBeNull();
        const load = await prisma.loads.findUnique({where: {ID: graph.loadId}});
        expect(load?.InvoiceID).toBeNull();
        expect(load?.Invoiced).toBe(false);
        const weekly = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        expect(weekly?.InvoiceID).toBeNull();
        expect(weekly?.Revenue).toBe(500);

        const available = await callTrpcQuery<Array<{ID: number}>>(
            "weeklies.getByCustomer",
            {customer: entities.customer.ID},
            ctx,
        );
        expect(available.some((row) => row.ID === graph.weeklyId)).toBe(true);

        const reinvoiceNumber = nextTestInvoiceNumber(95);
        await callTrpcMutation(
            "invoices.put",
            {
                Number: reinvoiceNumber,
                CustomerID: entities.customer.ID,
                InvoiceDate: new Date("2099-01-20T12:00:00.000Z"),
                TotalAmount: 500,
                selected: [String(graph.weeklyId)],
            },
            ctx,
        );
        const reinvoiced = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        expect(reinvoiced?.InvoiceID).toBeTruthy();
        const reinvoicedLoad = await prisma.loads.findUnique({where: {ID: graph.loadId}});
        expect(reinvoicedLoad?.Invoiced).toBe(true);
        if (reinvoiced?.InvoiceID) {
            tracker.track("invoices", reinvoiced.InvoiceID);
        }
    });

    it("invoices.postUnpaid clears Paid on a parent and its consolidated children", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const parent = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(91),
            CustomerID: entities.customer.ID,
            TotalAmount: 100,
            Paid: true,
            Consolidated: true,
        });
        const child = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(92),
            CustomerID: entities.customer.ID,
            TotalAmount: 40,
            Paid: true,
        });
        await prisma.invoices.update({
            where: {ID: child.ID},
            data: {ConsolidatedID: parent.ID, Paid: true, PaidDate: new Date()},
        });
        await prisma.invoices.update({
            where: {ID: parent.ID},
            data: {Paid: true, PaidDate: new Date()},
        });

        await callTrpcMutation("invoices.postUnpaid", {ID: parent.ID}, ctx);

        const updatedParent = await prisma.invoices.findUnique({where: {ID: parent.ID}});
        const updatedChild = await prisma.invoices.findUnique({where: {ID: child.ID}});
        expect(updatedParent?.Paid).toBe(false);
        expect(updatedChild?.Paid).toBe(false);
    });

    it("weeklies.postReopen clears Revenue when not invoiced and blocks when invoiced", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(91),
            weeklyRevenue: 250,
        });

        const job = await prisma.jobs.findUnique({where: {ID: graph.jobId}});
        await callTrpcMutation(
            "jobs.postClosed",
            {...job!, TruckingRevenue: 10, CompanyRevenue: 20},
            ctx,
        );
        expect(
            (await prisma.jobs.findUnique({where: {ID: graph.jobId}}))?.TruckingRevenue,
        ).toBe(10);

        await callTrpcMutation("weeklies.postReopen", {ID: graph.weeklyId}, ctx);
        const reopened = await prisma.weeklies.findUnique({where: {ID: graph.weeklyId}});
        expect(reopened?.Revenue).toBeNull();
        expect(reopened?.TotalWeight).toBeNull();

        const invoice = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(93),
            CustomerID: entities.customer.ID,
            TotalAmount: 250,
        });
        await prisma.weeklies.update({
            where: {ID: graph.weeklyId},
            data: {InvoiceID: invoice.ID, Revenue: 250},
        });
        await expect(
            callTrpcMutation("weeklies.postReopen", {ID: graph.weeklyId}, ctx),
        ).rejects.toThrow(/delete the invoice first/i);
    });

    it("jobs.postReopen clears revenues and blocks when paid out", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(92),
        });
        await prisma.jobs.update({
            where: {ID: graph.jobId},
            data: {TruckingRevenue: 100, CompanyRevenue: 200},
        });

        await callTrpcMutation("jobs.postReopen", {ID: graph.jobId}, ctx);
        const reopened = await prisma.jobs.findUnique({where: {ID: graph.jobId}});
        expect(reopened?.TruckingRevenue).toBeNull();
        expect(reopened?.CompanyRevenue).toBeNull();

        await prisma.jobs.update({
            where: {ID: graph.jobId},
            data: {PaidOut: true, TruckingRevenue: 100, CompanyRevenue: 200},
        });
        await expect(callTrpcMutation("jobs.postReopen", {ID: graph.jobId}, ctx)).rejects.toThrow(
            /unpay this job or delete its paystub/i,
        );
    });

    it("jobs.postUnpaid clears PaidOut unless a paystub is linked", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(93),
            paidOut: true,
        });

        await callTrpcMutation("jobs.postUnpaid", {ID: graph.jobId}, ctx);
        expect((await prisma.jobs.findUnique({where: {ID: graph.jobId}}))?.PaidOut).toBe(false);

        const paystub = await prisma.payStubs.create({
            data: {
                Created: new Date(),
                DriverID: entities.driver.ID,
                CheckNumber: `${TEST_NAME_PREFIX}-UNDO`,
                Gross: 100,
                Percentage: 0.25,
                NetTotal: 75,
                TakeHome: 75,
            },
        });
        tracker.track("payStubs", paystub.ID);
        await prisma.jobs.update({
            where: {ID: graph.jobId},
            data: {PaidOut: true, PayStubID: paystub.ID},
        });
        await expect(callTrpcMutation("jobs.postUnpaid", {ID: graph.jobId}, ctx)).rejects.toThrow(
            /delete the paystub first/i,
        );
    });

    it("loads.delete still rejects invoiced loads", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(95),
        });
        const invoice = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(94),
            CustomerID: entities.customer.ID,
            TotalAmount: 10,
        });
        await linkLoadToInvoice(prisma, graph.loadId!, invoice.ID);
        await expect(callTrpcMutation("loads.delete", {ID: graph.loadId}, ctx)).rejects.toThrow(
            /invoiced/i,
        );
    });

    it("loads.delete still rejects paid-out jobs", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(96),
            paidOut: true,
        });
        await expect(callTrpcMutation("loads.delete", {ID: graph.loadId}, ctx)).rejects.toThrow(
            /paid out/i,
        );
    });

    it("loads.delete succeeds after the invoice is deleted and the job is not paid out", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(97),
            weeklyRevenue: 500,
        });
        const invoice = await createTestInvoice(prisma, tracker, {
            Number: nextTestInvoiceNumber(96),
            CustomerID: entities.customer.ID,
            TotalAmount: 10,
        });
        await prisma.weeklies.update({
            where: {ID: graph.weeklyId},
            data: {InvoiceID: invoice.ID},
        });
        await linkLoadToInvoice(prisma, graph.loadId!, invoice.ID);

        await callTrpcMutation("invoices.delete", {ID: invoice.ID}, ctx);
        await callTrpcMutation("loads.delete", {ID: graph.loadId}, ctx);
        expect(await prisma.loads.findUnique({where: {ID: graph.loadId}})).toBeNull();
    });

    it("paystubs.delete resets jobs then removes the paystub", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const graph = await createJobGraph(prisma, tracker, {
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
            ticket: nextUniqueTicket(94),
        });
        const paystub = await prisma.payStubs.create({
            data: {
                Created: new Date(),
                DriverID: entities.driver.ID,
                CheckNumber: `${TEST_NAME_PREFIX}-DEL`,
                Gross: 100,
                Percentage: 0.25,
                NetTotal: 75,
                TakeHome: 75,
            },
        });
        tracker.track("payStubs", paystub.ID);
        await prisma.jobs.update({
            where: {ID: graph.jobId},
            data: {PaidOut: true, PayStubID: paystub.ID},
        });

        await callTrpcMutation("paystubs.delete", {ID: paystub.ID}, ctx);
        expect(await prisma.payStubs.findUnique({where: {ID: paystub.ID}})).toBeNull();
        const job = await prisma.jobs.findUnique({where: {ID: graph.jobId}});
        expect(job?.PaidOut).toBe(false);
        expect(job?.PayStubID).toBeNull();
    });
});
