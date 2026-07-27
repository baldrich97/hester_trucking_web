import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {assignSourceLoadType, createNewEraLoadType, createTestSource} from "../helpers/dbFixtures";
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

describe("sources admin (dev DB)", () => {
    it("CRUD source and assign load type", async () => {
        const source = await createTestSource(prisma, tracker, "ADM");
        const updated = await prisma.sources.update({
            where: {ID: source.ID},
            data: {ShortName: "T-AD2"},
        });
        expect(updated.ShortName).toBe("T-AD2");

        const {loadTypeId} = await createNewEraLoadType(prisma, tracker);
        await assignSourceLoadType(prisma, tracker, source.ID, loadTypeId);

        const link = await prisma.sourceLoadTypes.findUnique({
            where: {SourceID_LoadTypeID: {SourceID: source.ID, LoadTypeID: loadTypeId}},
        });
        expect(link?.UseCount).toBeGreaterThanOrEqual(1);
    });
});
