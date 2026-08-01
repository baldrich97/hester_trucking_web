import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {assertValidPdf} from "../helpers/pdfHandlerRunner";
import {TestRunTracker} from "../helpers/testRunTracker";
import {TEST_NAME_PREFIX} from "../helpers/testData";
import {
    createJobGraph,
    createTestInvoice,
    createTestSource,
    getBaseEntities,
    linkLoadToInvoice,
    nextTestInvoiceNumber,
    nextUniqueTicket,
    TEST_WEEK,
} from "../helpers/dbFixtures";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();
const baseUrl = process.env.PDF_TEST_BASE_URL ?? "http://127.0.0.1:3001";

type PdfFixtures = {
    dailyId: number;
    dailyWeek: string;
    weeklyId: number;
    weeklyWeek: string;
    invoiceId: number;
    paystubId: number;
    sourceId: number;
    customerId: number;
};

let fixtures: PdfFixtures;

async function fetchPdf(path: string) {
    const response = await fetch(`${baseUrl}${path}`);
    const body = Buffer.from(await response.arrayBuffer());
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
    });
    return {statusCode: response.status, headers, body};
}

beforeAll(async () => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
    fixtures = await resolveOrCreateFixtures();
}, 120000);

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
}, 120000);

async function resolveOrCreateFixtures(): Promise<PdfFixtures> {
    const entities = await getBaseEntities(prisma);
    const graph = await createJobGraph(prisma, tracker, {
        week: TEST_WEEK,
        driverId: entities.driver.ID,
        customerId: entities.customer.ID,
        loadTypeId: entities.legacyLoadType.ID,
        deliveryLocationId: entities.deliveryLocation.ID,
        truckId: entities.truck.ID,
        ticket: nextUniqueTicket(50),
    });

    const invoice = await createTestInvoice(prisma, tracker, {
        Number: nextTestInvoiceNumber(99),
        CustomerID: entities.customer.ID,
        TotalAmount: 360,
    });
    await prisma.weeklies.update({where: {ID: graph.weeklyId}, data: {InvoiceID: invoice.ID}});
    if (graph.loadId) {
        await linkLoadToInvoice(prisma, graph.loadId, invoice.ID);
    }

    const paystub = await prisma.payStubs.create({
        data: {
            Created: new Date(),
            DriverID: entities.driver.ID,
            CheckNumber: `${TEST_NAME_PREFIX}-PDF`,
            Gross: 500,
            Percentage: 0.25,
            NetTotal: 375,
            TakeHome: 375,
        },
    });
    tracker.track("payStubs", paystub.ID);
    await prisma.jobs.update({
        where: {ID: graph.jobId},
        data: {PayStubID: paystub.ID, PaidOut: true},
    });

    const source = await createTestSource(prisma, tracker, "PDF");

    return {
        dailyId: graph.dailyId,
        dailyWeek: graph.week,
        weeklyId: graph.weeklyId,
        weeklyWeek: graph.week,
        invoiceId: invoice.ID,
        paystubId: paystub.ID,
        sourceId: source.ID,
        customerId: entities.customer.ID,
    };
}

describe("PDF generation (dev DB via HTTP)", () => {
    it("daily full sheet", async () => {
        const id = `${fixtures.dailyId}|${fixtures.dailyWeek}|full`;
        const result = await fetchPdf(`/api/getPDF/daily/${encodeURIComponent(id)}`);
        assertValidPdf(result, "daily full");
    }, 90000);

    it("daily partial sheet", async () => {
        const id = `${fixtures.dailyId}|${fixtures.dailyWeek}|partial`;
        const result = await fetchPdf(`/api/getPDF/daily/${encodeURIComponent(id)}`);
        assertValidPdf(result, "daily partial");
    }, 90000);

    it("weekly sheet", async () => {
        const id = `${fixtures.weeklyId}|${fixtures.weeklyWeek}`;
        const result = await fetchPdf(`/api/getPDF/weekly/${encodeURIComponent(id)}`);
        assertValidPdf(result, "weekly");
    }, 90000);

    it("invoice", async () => {
        const result = await fetchPdf(`/api/getPDF/invoice/${fixtures.invoiceId}`);
        assertValidPdf(result, "invoice");
    }, 90000);

    it("paystub", async () => {
        const result = await fetchPdf(`/api/getPDF/paystub/${fixtures.paystubId}`);
        assertValidPdf(result, "paystub");
    }, 90000);

    it("source audit report", async () => {
        const id = `${fixtures.sourceId}|${encodeURIComponent("2024-01-01")}|${encodeURIComponent("2026-12-31")}`;
        const result = await fetchPdf(`/api/getPDF/report/${encodeURIComponent(id)}`);
        assertValidPdf(result, "source report");
    }, 90000);

    it("customer audit report", async () => {
        const id = `${fixtures.customerId}|${encodeURIComponent("2024-01-01")}|${encodeURIComponent("2026-12-31")}`;
        const result = await fetchPdf(`/api/getPDF/reportCustomer/${encodeURIComponent(id)}`);
        assertValidPdf(result, "customer report");
    }, 90000);

    it("driver forms w2", async () => {
        const result = await fetchPdf("/api/getPDF/driver-forms/w2");
        assertValidPdf(result, "driver forms w2");
    }, 90000);

    it("driver forms owner-operator", async () => {
        const result = await fetchPdf("/api/getPDF/driver-forms/oo");
        assertValidPdf(result, "driver forms oo");
    }, 90000);
});
