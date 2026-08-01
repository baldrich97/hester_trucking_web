import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {NEW_LOAD_TYPE_ID_THRESHOLD} from "../../src/config/sourcesCutover";
import {
    assignSourceLoadType,
    buildLoadPutInput,
    createNewEraLoadType,
    createTestContextWithPrisma,
    createTestSource,
    getBaseEntities,
    putLoad,
    seedOpenLegacyJob,
    trackLoadGraph,
} from "../helpers/dbFixtures";
import {callTrpcMutation} from "../helpers/trpcCaller";
import {nextTestTicket} from "../helpers/testData";
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

describe("cutover inline catalog + load entry (dev DB via tRPC)", () => {
    it("sources.put then loads.put completes a new-era load with the new source", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const {loadTypeId} = await createNewEraLoadType(prisma, tracker);

        const source = await callTrpcMutation<{ID: number; Name: string}>(
            "sources.put",
            {Name: `[TEST] Inline Source ${Date.now() % 100000}`, ShortName: "T-INLINE"},
            ctx,
        );
        tracker.track("sources", source.ID);
        await assignSourceLoadType(prisma, tracker, source.ID, loadTypeId);

        const {loadId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(70), {
                LoadTypeID: loadTypeId,
                SourceID: source.ID,
            }),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const load = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(load?.SourceID).toBe(source.ID);
        expect(load?.LoadTypeID).toBeGreaterThanOrEqual(NEW_LOAD_TYPE_ID_THRESHOLD);
    });

    it("loadtypes.put (AUTO_INCREMENT >= 10000) + assignSourceLoadType supports catalog expansion", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);
        const source = await createTestSource(prisma, tracker, "CAT");

        const created = await callTrpcMutation<{ID: number; Description: string}>(
            "loadtypes.put",
            {Description: `[TEST] Catalog ${Date.now() % 100000}`, Notes: ""},
            ctx,
        );
        tracker.track("loadTypes", created.ID);
        expect(created.ID).toBeGreaterThanOrEqual(NEW_LOAD_TYPE_ID_THRESHOLD);

        await assignSourceLoadType(prisma, tracker, source.ID, created.ID);

        const {loadId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(71), {
                LoadTypeID: created.ID,
                SourceID: source.ID,
            }),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const load = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(load?.LoadTypeID).toBe(created.ID);
        expect(load?.SourceID).toBe(source.ID);
    });

    it("legacy inline load type path still rematches without SourceID", async () => {
        const seed = await seedOpenLegacyJob(prisma, tracker);
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        const {loadId, jobId} = await putLoad(
            ctx,
            buildLoadPutInput(entities, nextTestTicket(72), {
                DriverID: seed.driverId,
                Week: seed.week,
                CustomerID: seed.customerId,
                LoadTypeID: seed.loadTypeId,
                DeliveryLocationID: seed.deliveryLocationId,
                SourceID: null,
            }),
        );
        await trackLoadGraph(prisma, tracker, loadId);

        const load = await prisma.loads.findUnique({where: {ID: loadId}});
        expect(load?.JobID).toBe(jobId);
        expect(load?.SourceID).toBeNull();
        expect(load?.LoadTypeID).toBeLessThan(NEW_LOAD_TYPE_ID_THRESHOLD);
    });

    it("sources.put is forbidden when cutover is inactive", async () => {
        const prev = process.env.SOURCES_CUTOVER_FORCE;
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";

        const ctx = await createTestContextWithPrisma(prisma);
        await expect(
            callTrpcMutation("sources.put", {Name: "[TEST] Blocked", ShortName: "T-NO"}, ctx),
        ).rejects.toThrow();

        if (prev) process.env.SOURCES_CUTOVER_FORCE = prev;
        process.env.SOURCES_CUTOVER_FORCE = "true";
    });
});
