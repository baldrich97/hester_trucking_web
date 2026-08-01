import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    createTestContextWithPrisma,
    createTestDriver,
    createTestLoadTypeForSearch,
    createTestPaystub,
    createTestTruck,
    linkTruckDriven,
    queryDriversSearch,
    queryLoadtypesPage,
    queryPaystubsSearch,
    queryTrucksSearch,
} from "../helpers/dbFixtures";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

describe("drivers table filters (dev DB)", () => {
    const tokens = {active: "DRVFIL-A1K", inactive: "DRVFIL-B2M", recommend: "DRVFIL-C3N"};
    let activeDriverId = 0;
    let inactiveDriverId = 0;
    let recommendDriverId = 0;
    let recommendTruckId = 0;

    beforeAll(async () => {
        const active = await createTestDriver(prisma, tracker, tokens.active, {active: true});
        const inactive = await createTestDriver(prisma, tracker, tokens.inactive, {active: false});
        const recommend = await createTestDriver(prisma, tracker, tokens.recommend, {active: true});
        const truck = await createTestTruck(prisma, tracker, "DRV-LINK-1");

        activeDriverId = active.ID;
        inactiveDriverId = inactive.ID;
        recommendDriverId = recommend.ID;
        recommendTruckId = truck.ID;

        await linkTruckDriven(prisma, tracker, recommendDriverId, recommendTruckId);
    });

    it("search finds driver by unique LastName token", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryDriversSearch(ctx, {
            search: tokens.active,
            orderBy: "LastName",
            order: "asc",
        });

        expect(rows.map((r) => r.ID)).toContain(activeDriverId);
        expect(rows.map((r) => r.ID)).not.toContain(inactiveDriverId);
    });

    it("onlyActive excludes inactive drivers from search results", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryDriversSearch(ctx, {
            search: tokens.inactive,
            onlyActive: true,
            orderBy: "LastName",
            order: "asc",
        });

        expect(rows.map((r) => r.ID)).not.toContain(inactiveDriverId);
    });

    it("TruckID assigns Truck group for drivers who have driven that truck", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryDriversSearch(ctx, {
            search: tokens.recommend,
            TruckID: recommendTruckId,
            orderBy: "LastName",
            order: "asc",
        });

        const match = rows.find((r) => r.ID === recommendDriverId);
        expect(match?.Group).toBe("Truck");
    });
});

describe("trucks table filters (dev DB)", () => {
    const tokens = {active: "TRKFIL-A4P", inactive: "TRKFIL-B5Q", recommend: "TRKFIL-C6R"};
    let activeTruckId = 0;
    let inactiveTruckId = 0;
    let recommendTruckId = 0;
    let recommendDriverId = 0;

    beforeAll(async () => {
        const active = await createTestTruck(prisma, tracker, tokens.active, {active: true});
        const inactive = await createTestTruck(prisma, tracker, tokens.inactive, {active: false});
        const recommend = await createTestTruck(prisma, tracker, tokens.recommend, {active: true});
        const driver = await createTestDriver(prisma, tracker, "TRK-LINK-1");

        activeTruckId = active.ID;
        inactiveTruckId = inactive.ID;
        recommendTruckId = recommend.ID;
        recommendDriverId = driver.ID;

        await linkTruckDriven(prisma, tracker, recommendDriverId, recommendTruckId);
    });

    it("search finds truck by unique Name token", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryTrucksSearch(ctx, {
            search: tokens.active,
            orderBy: "Name",
            order: "asc",
        });

        expect(rows.map((r) => r.ID)).toContain(activeTruckId);
        expect(rows.map((r) => r.ID)).not.toContain(inactiveTruckId);
    });

    it("onlyActive excludes inactive trucks from search results", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryTrucksSearch(ctx, {
            search: tokens.inactive,
            onlyActive: true,
            orderBy: "Name",
            order: "asc",
        });

        expect(rows.map((r) => r.ID)).not.toContain(inactiveTruckId);
    });

    it("DriverID assigns Driver group for trucks driven by that driver", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryTrucksSearch(ctx, {
            search: tokens.recommend,
            DriverID: recommendDriverId,
            orderBy: "Name",
            order: "asc",
        });

        const match = rows.find((r) => r.ID === recommendTruckId);
        expect(match?.Group).toBe("Driver");
    });
});

describe("paystubs table filters (dev DB)", () => {
    const token = "PAYFIL-X8T";
    let driverId = 0;
    let paystubId = 0;

    beforeAll(async () => {
        const driver = await createTestDriver(prisma, tracker, token, {active: true});
        driverId = driver.ID;
        const paystub = await createTestPaystub(prisma, tracker, driverId, token);
        paystubId = paystub.ID;
    });

    it("search finds paystub by driver LastName token", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryPaystubsSearch(ctx, {
            search: token,
            orderBy: "ID",
            order: "desc",
        });

        expect(rows.map((r) => r.ID)).toContain(paystubId);
    });

    it("search without text paginates (page 0 returns rows)", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const rows = await queryPaystubsSearch(ctx, {
            search: "",
            page: 0,
            orderBy: "ID",
            order: "desc",
        });

        expect(rows.length).toBeGreaterThan(0);
        expect(rows.length).toBeLessThanOrEqual(50);
    });
});

describe("loadtypes table filters (dev DB)", () => {
    const token = "LTFIL-Z9W";
    let loadTypeId = 0;

    beforeAll(async () => {
        const loadType = await createTestLoadTypeForSearch(prisma, tracker, token);
        loadTypeId = loadType.ID;
    });

    it("searchPage finds load type by Description token", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryLoadtypesPage(ctx, {
            search: token,
            page: 0,
            orderBy: "Description",
            order: "asc",
        });

        expect(page.count).toBeGreaterThanOrEqual(1);
        expect(page.rows.map((r) => r.ID)).toContain(loadTypeId);
    });

    it("searchPage count matches filtered results", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const page = await queryLoadtypesPage(ctx, {
            search: token,
            page: 0,
            orderBy: "Description",
            order: "asc",
        });

        expect(page.count).toBeGreaterThanOrEqual(page.rows.length);
        expect(page.rows.length).toBeLessThanOrEqual(10);
    });
});
