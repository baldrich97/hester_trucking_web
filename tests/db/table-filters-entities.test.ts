import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    buildLoadPutInput,
    createTestContextWithPrisma,
    createTestCustomer,
    createTestInvoice,
    createTestSource,
    getBaseEntities,
    linkLoadToInvoice,
    nextTestInvoiceNumber,
    nextUniqueTicket,
    putLoad,
    queryCustomersPage,
    queryInvoicesPage,
    querySourcesPage,
    trackLoadGraph,
} from "../helpers/dbFixtures";
import {callTrpcQuery} from "../helpers/trpcCaller";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

describe("customers table filters (dev DB)", () => {
    const tokens = {alpha: "CUST-A7K2", beta: "CUST-B9M4"};
    let customerAId = 0;
    let customerBId = 0;

    beforeAll(async () => {
        const a = await createTestCustomer(prisma, tracker, tokens.alpha);
        const b = await createTestCustomer(prisma, tracker, tokens.beta);
        customerAId = a.ID;
        customerBId = b.ID;
    });

    it("searchPage finds customer by unique name token", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryCustomersPage(ctx, {
            search: tokens.alpha,
            page: 0,
            orderBy: "Name",
            order: "asc",
        });

        expect(page.count).toBeGreaterThanOrEqual(1);
        expect(page.rows.map((r) => r.ID)).toContain(customerAId);
        expect(page.rows.map((r) => r.ID)).not.toContain(customerBId);
    });

    it("searchPage includes target customer in filtered results", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryCustomersPage(ctx, {
            search: tokens.beta,
            page: 0,
            orderBy: "Name",
            order: "asc",
        });

        expect(page.count).toBeGreaterThanOrEqual(1);
        expect(page.rows.length).toBeLessThanOrEqual(10);
        expect(page.rows.map((r) => r.ID)).toContain(customerBId);
    });

    it("searchPage sorts by Name ascending", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryCustomersPage(ctx, {
            search: "CUST-",
            page: 0,
            orderBy: "Name",
            order: "asc",
        });

        const names = page.rows.map((r: {Name?: string}) => r.Name).filter(Boolean) as string[];
        for (let i = 1; i < names.length; i++) {
            expect(names[i]!.localeCompare(names[i - 1]!)).toBeGreaterThanOrEqual(0);
        }
    });
});

describe("sources table filters (dev DB)", () => {
    const tokens = {alpha: "SRC-X3P1", beta: "SRC-Y8Q2"};
    let sourceAId = 0;
    let sourceBId = 0;

    beforeAll(async () => {
        const a = await createTestSource(prisma, tracker, tokens.alpha);
        const b = await createTestSource(prisma, tracker, tokens.beta);
        sourceAId = a.ID;
        sourceBId = b.ID;
    });

    it("searchPage finds source by unique name token", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await querySourcesPage(ctx, {search: tokens.alpha, page: 0});

        expect(page.count).toBeGreaterThanOrEqual(1);
        expect(page.rows.map((r) => r.ID)).toContain(sourceAId);
        expect(page.rows.map((r) => r.ID)).not.toContain(sourceBId);
    });

    it("searchPage returns exact match when token is specific", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await querySourcesPage(ctx, {search: tokens.beta, page: 0});

        expect(page.rows.some((r) => r.ID === sourceBId)).toBe(true);
    });

    it("searchPage count is consistent with row length for filtered page", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await querySourcesPage(ctx, {
            search: tokens.alpha,
            page: 0,
            orderBy: "Name",
            order: "asc",
        });

        expect(page.count).toBeGreaterThanOrEqual(page.rows.length);
        expect(page.rows.length).toBeLessThanOrEqual(10);
    });
});

describe("invoices table filters (dev DB)", () => {
    let invoiceAId = 0;
    let invoiceBId = 0;
    let invoiceNumberA = 0;
    let invoiceNumberB = 0;
    let customerAId = 0;
    let customerBId = 0;
    let loadTypeAId = 0;
    let loadTypeBId = 0;
    let totalAmountA = 8877;
    let loadAId = 0;

    beforeAll(async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        loadTypeAId = entities.legacyLoadType.ID;

        const altLoadType = await prisma.loadTypes.findFirst({
            where: {
                ID: {lt: 10000, not: entities.legacyLoadType.ID},
                OR: [{Deleted: false}, {Deleted: null}],
            },
            orderBy: {ID: "asc"},
        });
        loadTypeBId = altLoadType?.ID ?? entities.legacyLoadType.ID;

        const custA = await createTestCustomer(prisma, tracker, "INV-CUST-A");
        const custB = await createTestCustomer(prisma, tracker, "INV-CUST-B");
        customerAId = custA.ID;
        customerBId = custB.ID;

        invoiceNumberA = nextTestInvoiceNumber(10);
        invoiceNumberB = nextTestInvoiceNumber(11);

        const invA = await createTestInvoice(prisma, tracker, {
            Number: invoiceNumberA,
            CustomerID: customerAId,
            TotalAmount: totalAmountA,
            Paid: false,
        });
        const invB = await createTestInvoice(prisma, tracker, {
            Number: invoiceNumberB,
            CustomerID: customerBId,
            TotalAmount: 4422,
            Paid: true,
        });
        invoiceAId = invA.ID;
        invoiceBId = invB.ID;

        const loadA = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextUniqueTicket(50), {
                CustomerID: customerAId,
                LoadTypeID: loadTypeAId,
            }),
        );
        loadAId = loadA.loadId;
        await linkLoadToInvoice(prisma, loadAId, invoiceAId);
        await trackLoadGraph(prisma, tracker, loadAId);

        const loadB = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextUniqueTicket(51), {
                CustomerID: customerBId,
                LoadTypeID: loadTypeBId,
            }),
        );
        await linkLoadToInvoice(prisma, loadB.loadId, invoiceBId);
        await trackLoadGraph(prisma, tracker, loadB.loadId);
    });

    it("getAllPage filters by invoice Number search", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryInvoicesPage(ctx, {
            page: 0,
            search: invoiceNumberA,
            orderBy: "ID",
            order: "desc",
        });

        expect(page.count).toBeGreaterThanOrEqual(1);
        expect(page.rows.map((r) => r.ID)).toContain(invoiceAId);
        expect(page.rows.map((r) => r.ID)).not.toContain(invoiceBId);
    });

    it("getAllPage filters by customer", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryInvoicesPage(ctx, {
            page: 0,
            customer: customerAId,
            orderBy: "ID",
            order: "desc",
        });

        expect(page.rows.map((r) => r.ID)).toContain(invoiceAId);
        expect(page.rows.map((r) => r.ID)).not.toContain(invoiceBId);
    });

    it("getAllPage filters by loadType via linked Loads", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryInvoicesPage(ctx, {
            page: 0,
            customer: customerAId,
            loadType: loadTypeAId,
            orderBy: "ID",
            order: "desc",
        });

        expect(page.rows.map((r) => r.ID)).toContain(invoiceAId);
    });

    it("getAllPage filters by TotalAmount search", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryInvoicesPage(ctx, {
            page: 0,
            search: totalAmountA,
            orderBy: "ID",
            order: "desc",
        });

        expect(page.rows.map((r) => r.ID)).toContain(invoiceAId);
    });

    it("getCount unpaid tab includes unpaid test invoice", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const count = await callTrpcQuery<number>(
            "invoices.getCount",
            {tabValue: 0, customer: customerAId},
            ctx,
        );
        expect(count).toBeGreaterThanOrEqual(1);
    });

    it("getAllUnpaidPage excludes paid invoices for customer", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await callTrpcQuery<{rows: {ID: number}[]; count: number}>(
            "invoices.getAllUnpaidPage",
            {page: 0, customer: customerBId, orderBy: "ID", order: "desc"},
            ctx,
        );

        expect(page.rows.map((r) => r.ID)).not.toContain(invoiceBId);
    });

    it("getCount matches getAllPage for customer filter", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const filter = {customer: customerAId};
        const page = await queryInvoicesPage(ctx, {page: 0, orderBy: "ID", order: "desc", ...filter});
        const count = await callTrpcQuery<number>("invoices.getCount", filter, ctx);
        expect(page.count).toBe(count);
    });
});
