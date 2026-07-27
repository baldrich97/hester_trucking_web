import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PrismaClient} from "@prisma/client";
import {TEST_NAME_PREFIX} from "../helpers/testData";
import {createTestContextWithPrisma, getBaseEntities} from "../helpers/dbFixtures";
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

describe("carriers admin (dev DB via tRPC)", () => {
    it("creates, updates, and deletes a carrier", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const state = await prisma.states.findFirst({orderBy: {ID: "asc"}});
        expect(state).toBeTruthy();

        const created = await callTrpcMutation<{ID: number; Name: string}>(
            "carriers.put",
            {Name: `${TEST_NAME_PREFIX} Carrier-CRUD`, State: state!.ID},
            ctx,
        );
        tracker.track("carriers", created.ID);

        const updated = await callTrpcMutation<{Name: string}>(
            "carriers.post",
            {ID: created.ID, Name: `${TEST_NAME_PREFIX} Carrier-UPD`, State: state!.ID},
            ctx,
        );
        expect(updated.Name).toContain("Carrier-UPD");

        const page = await callTrpcQuery<{rows: {ID: number}[]; count: number}>(
            "carriers.searchPage",
            {search: "Carrier-UPD", page: 0},
            ctx,
        );
        expect(page.rows.map((r) => r.ID)).toContain(created.ID);

        await callTrpcMutation("carriers.delete", {ID: created.ID}, ctx);
        const gone = await prisma.carriers.findUnique({where: {ID: created.ID}});
        expect(gone).toBeNull();
    });
});

describe("driver forms compliance (dev DB via tRPC)", () => {
    it("upserts driver form and returns compliance summary", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        let form = await prisma.forms.findFirst({orderBy: {ID: "asc"}});
        if (!form) {
            form = await prisma.forms.create({
                data: {
                    Name: `${TEST_NAME_PREFIX} FORM`,
                    DisplayName: `${TEST_NAME_PREFIX} FORM`,
                },
            });
            tracker.track("forms", form.ID);
        }

        let formOption = await prisma.formOptions.findFirst({where: {Form: form.ID}});
        if (!formOption) {
            formOption = await prisma.formOptions.create({
                data: {
                    Form: form.ID,
                    W2Visible: true,
                    OOVisible: true,
                    W2Required: true,
                    OORequired: false,
                    ExpiryCadence: "EXPIRATION_DATE",
                },
            });
            tracker.track("formOptions", formOption.ID);
        }

        await callTrpcMutation(
            "driverForms.put",
            {
                Driver: entities.driver.ID,
                Form: form.ID,
                Expiration: new Date("2099-12-31T12:00:00.000Z"),
                FiledDate: new Date("2099-01-01T12:00:00.000Z"),
            },
            ctx,
        );
        tracker.trackDriverForm(entities.driver.ID, form.ID);

        const summary = await callTrpcQuery<{
            w2Issues: number;
            ooIssues: number;
            totalIssues: number;
        }>("compliance.driverFormsSummary", undefined, ctx);
        expect(typeof summary.w2Issues).toBe("number");
        expect(typeof summary.ooIssues).toBe("number");

        const expiring = await callTrpcQuery<{
            daysAhead: number;
            w2Groups: unknown[];
            ooGroups: unknown[];
        }>("compliance.driverFormsExpiringSoon", undefined, ctx);
        expect(expiring.daysAhead).toBe(30);
        expect(Array.isArray(expiring.w2Groups)).toBe(true);
        expect(Array.isArray(expiring.ooGroups)).toBe(true);
    });
});
