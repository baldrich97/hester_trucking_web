import {afterEach, describe, expect, it} from "vitest";
import {configurePrismaMockDefaults} from "../helpers/configurePrismaMock";
import {expectCountWhere, expectFindManyWhere} from "../helpers/expectPrisma";
import {createPrismaMock} from "../helpers/prismaMock";
import {callTrpcQuery, createTestContext} from "../helpers/trpcCaller";

describe("table filter queries (mocked Prisma where clauses)", () => {
    afterEach(() => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
    });

    it("loads.getAllPage applies entity filters, sort, and pagination", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.loads.findMany.mockResolvedValue([]);
        prisma.loads.count.mockResolvedValue(0);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery(
            "loads.getAllPage",
            {
                page: 2,
                customer: 5,
                driver: 7,
                truck: 3,
                loadType: 12,
                deliveryLocation: 9,
                search: 999040,
                orderBy: "TicketNumber",
                order: "asc",
            },
            ctx,
        );

        expectFindManyWhere(
            prisma,
            "loads",
            {
                OR: [{Deleted: false}, {Deleted: null}],
                CustomerID: 5,
                DriverID: 7,
                TruckID: 3,
                LoadTypeID: 12,
                DeliveryLocationID: 9,
                TicketNumber: 999040,
            },
            {skip: 20, take: 10, orderBy: {TicketNumber: "asc"}},
        );
        expectCountWhere(prisma, "loads", {
            CustomerID: 5,
            DriverID: 7,
            TicketNumber: 999040,
        });
    });

    it("loads.getUninvPage adds Invoiced null constraint", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.loads.findMany.mockResolvedValue([]);
        prisma.loads.count.mockResolvedValue(0);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery("loads.getUninvPage", {page: 0, driver: 4}, ctx);

        expectFindManyWhere(prisma, "loads", {
            Invoiced: null,
            DriverID: 4,
        });
    });

    it("loads.getAllPage ignores filter value 0 (truthy check)", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.loads.findMany.mockResolvedValue([]);
        prisma.loads.count.mockResolvedValue(0);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery("loads.getAllPage", {page: 0, customer: 0, driver: 0}, ctx);

        const call = prisma.loads.findMany.mock.calls.at(-1)![0] as {where: Record<string, unknown>};
        expect(call.where.CustomerID).toBeUndefined();
        expect(call.where.DriverID).toBeUndefined();
    });

    it("invoices.getAllPage applies customer and load relation filters", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.invoices.findMany.mockResolvedValue([]);
        prisma.invoices.count.mockResolvedValue(0);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery(
            "invoices.getAllPage",
            {
                page: 1,
                customer: 8,
                loadType: 15,
                deliveryLocation: 6,
                search: 1200,
                orderBy: "InvoiceDate",
                order: "desc",
            },
            ctx,
        );

        expectFindManyWhere(
            prisma,
            "invoices",
            {
                CustomerID: 8,
                Loads: {some: {LoadTypeID: 15}},
            },
            {skip: 10, take: 10},
        );
        const call = prisma.invoices.findMany.mock.calls.at(-1)![0] as {
            where: {OR?: unknown[]; Loads?: unknown};
        };
        expect(call.where.OR).toEqual([{TotalAmount: 1200}, {Number: 1200}]);
    });

    it("invoices.getCount uses tabValue for paid vs unpaid", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.invoices.count.mockResolvedValue(0);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery("invoices.getCount", {tabValue: 1, customer: 3}, ctx);

        expectCountWhere(prisma, "invoices", {
            Paid: true,
            CustomerID: 3,
        });
    });

    it("drivers.search filters onlyActive and name search", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.drivers.findMany.mockResolvedValue([]);
        prisma.trucksDriven.findMany.mockResolvedValue([{DriverID: 2}]);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery(
            "drivers.search",
            {search: "smith", page: 0, TruckID: 9, onlyActive: true, orderBy: "LastName", order: "asc"},
            ctx,
        );

        const call = prisma.drivers.findMany.mock.calls.at(-1)![0] as {
            where: {AND: Array<{AND?: Array<{Active?: boolean}>}>};
            skip: number;
            take: number;
        };
        expect(call.where.AND[0]!.AND).toEqual(
            expect.arrayContaining([{Active: true}]),
        );
        expect(call.take).toBe(10);
    });

    it("trucks.search filters onlyActive and name search", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.trucks.findMany.mockResolvedValue([]);
        prisma.trucksDriven.findMany.mockResolvedValue([]);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery(
            "trucks.search",
            {search: "peterbilt", page: 0, onlyActive: true, orderBy: "Name", order: "asc"},
            ctx,
        );

        const call = prisma.trucks.findMany.mock.calls.at(-1)![0] as {
            where: {AND: Array<{AND?: Array<{Active?: boolean}>}>};
        };
        expect(call.where.AND[0]!.AND).toEqual(
            expect.arrayContaining([{Active: true}]),
        );
    });

    it("customers.searchPage applies text search OR fields", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.customers.findMany.mockResolvedValue([]);
        prisma.customers.count.mockResolvedValue(0);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery(
            "customers.searchPage",
            {search: "Acme", page: 0, orderBy: "Name", order: "asc"},
            ctx,
        );

        const call = prisma.customers.findMany.mock.calls.at(-1)![0] as {where: {OR: unknown[]}};
        expect(call.where.OR).toEqual(
            expect.arrayContaining([{Name: {contains: "Acme"}}]),
        );
    });

    it("sources.searchPage applies name contains and default sort", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.sources.findMany.mockResolvedValue([]);
        prisma.sources.count.mockResolvedValue(0);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery(
            "sources.searchPage",
            {search: "Fruitland", page: 0},
            ctx,
        );

        expectFindManyWhere(prisma, "sources", {Name: {contains: "Fruitland"}}, {
            orderBy: {Name: "asc"},
            skip: 0,
            take: 10,
        });
    });

    it("loadtypes.searchPage paginates", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.loadTypes.findMany.mockResolvedValue([]);
        prisma.loadTypes.count.mockResolvedValue(0);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery("loadtypes.searchPage", {search: "asphalt", page: 3}, ctx);

        expectFindManyWhere(prisma, "loadTypes", {
            OR: [{Deleted: false}, {Deleted: null}],
            AND: {
                OR: [{Notes: {contains: "asphalt"}}, {Description: {contains: "asphalt"}}],
            },
        }, {skip: 30, take: 10});
    });

    it("paystubs.search filters by driver name", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.payStubs.findMany.mockResolvedValue([]);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery(
            "paystubs.search",
            {search: "john", page: 1, orderBy: "ID", order: "desc"},
            ctx,
        );

        const call = prisma.payStubs.findMany.mock.calls.at(-1)![0] as {
            where: {Drivers: {is: {OR: unknown[]}}};
            take: number;
        };
        expect(call.where.Drivers.is.OR).toEqual(
            expect.arrayContaining([
                {FirstName: {contains: "john"}},
                {LastName: {contains: "john"}},
            ]),
        );
        expect(call.take).toBe(50);
    });

    it("dailies.getByWeek applies week and W2 filter", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.dailies.findMany.mockResolvedValue([]);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery("dailies.getByWeek", {week: "2099-W02", filterW2: true}, ctx);

        expectFindManyWhere(prisma, "dailies", {
            Week: "2099-W02",
            Drivers: {OwnerOperator: {not: true}},
        });
    });

    it("weeklies.getByWeek filters by week string", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.weeklies.findMany.mockResolvedValue([]);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery("weeklies.getByWeek", {week: "2099-W02"}, ctx);

        expectFindManyWhere(prisma, "weeklies", {Week: "2099-W02"});
    });

    it("weeklies.getByCustomer filters open invoicable weeklies", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.weeklies.findMany.mockResolvedValue([]);
        const ctx = await createTestContext(prisma);

        await callTrpcQuery("weeklies.getByCustomer", {customer: 42}, ctx);

        expectFindManyWhere(prisma, "weeklies", {
            CustomerID: 42,
            InvoiceID: null,
            NOT: {Revenue: null},
        });
    });
});
