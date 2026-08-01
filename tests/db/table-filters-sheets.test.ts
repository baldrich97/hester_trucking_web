import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {callTrpcQuery} from "../helpers/trpcCaller";
import {
    createJobGraph,
    createTestContextWithPrisma,
    createTestCustomer,
    createTestDriver,
    findInNotPrintedPages,
    getBaseEntities,
    queryDailiesByWeek,
    queryWeekliesByWeek,
    TEST_WEEK_SHEETS,
} from "../helpers/dbFixtures";
import {TestRunTracker} from "../helpers/testRunTracker";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();
const FILTER_WEEK = "2099-W03";

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

describe("dailies sheet filters (dev DB)", () => {
    let sheetDailyId = 0;
    let w2DailyId = 0;
    let ooDailyId = 0;
    let notPrintedDailyId = 0;

    beforeAll(async () => {
        const entities = await getBaseEntities(prisma);
        const sheetGraph = await createJobGraph(prisma, tracker, {
            week: TEST_WEEK_SHEETS,
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
        });
        sheetDailyId = sheetGraph.dailyId;

        const w2Driver = await createTestDriver(prisma, tracker, "W2-FIL", {ownerOperator: false});
        const ooDriver = await createTestDriver(prisma, tracker, "OO-FIL", {ownerOperator: true});

        const w2Graph = await createJobGraph(prisma, tracker, {
            week: FILTER_WEEK,
            driverId: w2Driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
        });
        w2DailyId = w2Graph.dailyId;

        const ooGraph = await createJobGraph(prisma, tracker, {
            week: FILTER_WEEK,
            driverId: ooDriver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truckB.ID,
        });
        ooDailyId = ooGraph.dailyId;

        const notPrintedGraph = await createJobGraph(prisma, tracker, {
            week: "2099-W04",
            driverId: entities.driverB.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truckB.ID,
        });
        notPrintedDailyId = notPrintedGraph.dailyId;
        await prisma.dailies.update({
            where: {ID: notPrintedDailyId},
            data: {LastPrinted: null},
        });
    });

    it("getByWeek returns dailies for isolated test week", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryDailiesByWeek(ctx, {week: TEST_WEEK_SHEETS});
        expect(rows.map((r) => r.ID)).toContain(sheetDailyId);
    });

    it("getByWeek filterW2 excludes owner-operators", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryDailiesByWeek(ctx, {week: FILTER_WEEK, filterW2: true});
        const ids = rows.map((r) => r.ID);
        expect(ids).toContain(w2DailyId);
        expect(ids).not.toContain(ooDailyId);
    });

    it("getByWeek filterOperator includes only owner-operators", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryDailiesByWeek(ctx, {week: FILTER_WEEK, filterOperator: true});
        const ids = rows.map((r) => r.ID);
        expect(ids).toContain(ooDailyId);
        expect(ids).not.toContain(w2DailyId);
    });

    it("getNotPrinted includes unprinted daily with loads", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const found = await findInNotPrintedPages(ctx, prisma, "dailies.getNotPrinted", notPrintedDailyId);
        expect(found).toBe(true);
    });
});

describe("weeklies sheet filters (dev DB)", () => {
    let weeklyId = 0;
    let notPrintedWeeklyId = 0;
    let customerId = 0;

    beforeAll(async () => {
        const entities = await getBaseEntities(prisma);
        const customer = await createTestCustomer(prisma, tracker, "WK-CUST");
        customerId = customer.ID;

        const graph = await createJobGraph(prisma, tracker, {
            week: TEST_WEEK_SHEETS,
            driverId: entities.driver.ID,
            customerId: entities.customer.ID,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truck.ID,
        });
        weeklyId = graph.weeklyId;

        const openGraph = await createJobGraph(prisma, tracker, {
            week: "2099-W05",
            driverId: entities.driverB.ID,
            customerId: customerId,
            loadTypeId: entities.legacyLoadType.ID,
            deliveryLocationId: entities.deliveryLocation.ID,
            truckId: entities.truckB.ID,
            weeklyRevenue: 1500,
        });
        notPrintedWeeklyId = openGraph.weeklyId;
        await prisma.weeklies.update({
            where: {ID: notPrintedWeeklyId},
            data: {LastPrinted: null, InvoiceID: null, Revenue: 1500},
        });
    });

    it("getByWeek returns weeklies for isolated test week", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryWeekliesByWeek(ctx, TEST_WEEK_SHEETS);
        expect(rows.map((r) => r.ID)).toContain(weeklyId);
    });

    it("getNotPrinted includes unprinted weekly with loads", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const found = await findInNotPrintedPages(ctx, prisma, "weeklies.getNotPrinted", notPrintedWeeklyId);
        expect(found).toBe(true);
    });

    it("getByCustomer returns open weeklies with revenue and loads", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await callTrpcQuery<Array<{ID: number}>>(
            "weeklies.getByCustomer",
            {customer: customerId},
            ctx,
        );
        expect(rows.map((r) => r.ID)).toContain(notPrintedWeeklyId);
    });
});
