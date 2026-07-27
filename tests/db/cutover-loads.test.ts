import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {rematchLoadToJob} from "../../src/server/loadRematch";
import {NEW_LOAD_TYPE_ID_THRESHOLD} from "../../src/config/sourcesCutover";
import {nextTestTicket, TEST_NAME_PREFIX} from "../helpers/testData";
import {TestRunTracker} from "../helpers/testRunTracker";
import {trackJobGraph} from "../helpers/dbFixtures";

const prisma = new PrismaClient();
const tracker = new TestRunTracker();

beforeAll(() => {
    process.env.SOURCES_CUTOVER_FORCE = "true";
});

afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

describe("cutover load rematch (dev DB)", () => {
    it("new-era jobs split by SourceID for same material", async () => {
        const driver = await prisma.drivers.findFirst({where: {Active: true}});
        const customer = await prisma.customers.findFirst();
        const dl = await prisma.deliveryLocations.findFirst();
        expect(driver && customer && dl).toBeTruthy();

        const fruitland = await prisma.sources.create({
            data: {Name: `${TEST_NAME_PREFIX} Fruitland`, ShortName: "T-FRUIT"},
        });
        const ws = await prisma.sources.create({
            data: {Name: `${TEST_NAME_PREFIX} WS`, ShortName: "T-WS"},
        });
        tracker.track("sources", fruitland.ID);
        tracker.track("sources", ws.ID);

        const maxId = await prisma.loadTypes.aggregate({_max: {ID: true}});
        const ltId = Math.max(NEW_LOAD_TYPE_ID_THRESHOLD, (maxId._max.ID ?? 0) + 1);
        const asphalt = await prisma.loadTypes.create({
            data: {ID: ltId, Description: `${TEST_NAME_PREFIX} ASPHALT`, Deleted: false},
        });
        tracker.track("loadTypes", asphalt.ID);

        const week = "2026-W30";
        const rates = {
            TruckRate: 12,
            MaterialRate: 8,
            DriverRate: 10,
            TotalRate: 20,
        };
        const ctx = {prisma};

        const r1 = await rematchLoadToJob(ctx, {
            DriverID: driver!.ID,
            CustomerID: customer!.ID,
            LoadTypeID: asphalt.ID,
            DeliveryLocationID: dl!.ID,
            Week: week,
            ...rates,
            SourceID: fruitland.ID,
        });
        const r2 = await rematchLoadToJob(ctx, {
            DriverID: driver!.ID,
            CustomerID: customer!.ID,
            LoadTypeID: asphalt.ID,
            DeliveryLocationID: dl!.ID,
            Week: week,
            ...rates,
            SourceID: ws.ID,
        });

        await trackJobGraph(prisma, tracker, r1.JobID);
        await trackJobGraph(prisma, tracker, r2.JobID);

        expect(r1.JobID).not.toBe(r2.JobID);
        expect(r1.SourceID).toBe(fruitland.ID);
        expect(r2.SourceID).toBe(ws.ID);

        const truck = await prisma.trucks.findFirst({where: {Active: true}});
        expect(truck).toBeTruthy();

        const load = await prisma.loads.create({
            data: {
                TicketNumber: nextTestTicket(1),
                DriverID: driver!.ID,
                TruckID: truck!.ID,
                CustomerID: customer!.ID,
                LoadTypeID: asphalt.ID,
                DeliveryLocationID: dl!.ID,
                Week: week,
                StartDate: new Date(),
                JobID: r1.JobID,
                Weight: 18,
                ...rates,
                TotalAmount: rates.TotalRate * 18,
                SourceID: fruitland.ID,
            },
        });
        tracker.track("loads", load.ID);
        expect(load.SourceID).toBe(fruitland.ID);
        expect(load.LoadTypeID).toBeGreaterThanOrEqual(NEW_LOAD_TYPE_ID_THRESHOLD);
    });

    it("legacy rematch does not set SourceID", async () => {
        const legacyJob = await prisma.jobs.findFirst({
            where: {
                PaidOut: {not: true},
                LoadTypeID: {lt: NEW_LOAD_TYPE_ID_THRESHOLD},
                Weeklies: {InvoiceID: null},
            },
            include: {Dailies: true},
        });
        if (!legacyJob?.Dailies) {
            return;
        }
        const ctx = {prisma};
        const rematch = await rematchLoadToJob(ctx, {
            DriverID: legacyJob.DriverID,
            CustomerID: legacyJob.CustomerID,
            LoadTypeID: legacyJob.LoadTypeID,
            DeliveryLocationID: legacyJob.DeliveryLocationID,
            Week: legacyJob.Dailies.Week,
            TruckRate: legacyJob.TruckingRate,
            MaterialRate: legacyJob.MaterialRate,
            DriverRate: legacyJob.DriverRate,
            TotalRate: legacyJob.CompanyRate,
            SourceID: null,
        });
        expect(rematch.SourceID).toBeNull();
        expect(rematch.JobID).toBe(legacyJob.ID);
    });
});

describe("loadtypes era (dev DB)", () => {
    it("has legacy load types below threshold", async () => {
        const legacy = await prisma.loadTypes.findFirst({
            where: {ID: {lt: NEW_LOAD_TYPE_ID_THRESHOLD}},
        });
        expect(legacy).toBeTruthy();
    });
});
