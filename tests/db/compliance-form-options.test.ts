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

describe("formsCatalog + formOptions (dev DB via tRPC)", () => {
    it("creates a form with default options and updates tracker flags", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const token = String(Date.now() % 1000000);
        const name = `${TEST_NAME_PREFIX}-DB-TRK-${token}`;
        const display = `${TEST_NAME_PREFIX} DB Tracker ${token}`;

        const existing = await prisma.forms.findFirst({where: {Name: name}});
        if (existing) {
            tracker.track("forms", existing.ID);
            const opt = await prisma.formOptions.findFirst({where: {Form: existing.ID}});
            if (opt) tracker.track("formOptions", opt.ID);
        } else {
            const created = await callTrpcMutation<{ID: number}>(
                "formsCatalog.createWithOptions",
                {Name: name, DisplayName: display},
                ctx,
            );
            tracker.track("forms", created.ID);

            const opt = await prisma.formOptions.findFirst({where: {Form: created.ID}});
            expect(opt).toBeTruthy();
            tracker.track("formOptions", opt!.ID);

            await callTrpcMutation(
                "formOptions.update",
                {
                    ID: opt!.ID,
                    Form: created.ID,
                    W2Visible: true,
                    OOVisible: true,
                    W2Required: true,
                    OORequired: false,
                    FleetWide: false,
                    ExpiryCadence: "EXPIRATION_DATE",
                    ValidityMonths: null,
                    PdfOrder: 0,
                    PdfColumnLabel: null,
                    IncludeInPdf: true,
                },
                ctx,
            );

            const updated = await prisma.formOptions.findUnique({where: {ID: opt!.ID}});
            expect(updated?.W2Required).toBe(true);
            expect(updated?.OOVisible).toBe(true);
        }
    });

    it("forces IncludeInPdf when W2Required even if the client sends false", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const token = String(Date.now() % 1000000);
        const name = `${TEST_NAME_PREFIX}-DB-PDF-${token}`;
        const display = `${TEST_NAME_PREFIX} DB PDF ${token}`;

        const created = await callTrpcMutation<{ID: number}>(
            "formsCatalog.createWithOptions",
            {Name: name, DisplayName: display},
            ctx,
        );
        tracker.track("forms", created.ID);
        const opt = await prisma.formOptions.findFirst({where: {Form: created.ID}});
        expect(opt).toBeTruthy();
        tracker.track("formOptions", opt!.ID);

        await callTrpcMutation(
            "formOptions.update",
            {
                ID: opt!.ID,
                Form: created.ID,
                W2Visible: true,
                OOVisible: false,
                W2Required: true,
                OORequired: false,
                FleetWide: false,
                ExpiryCadence: "EXPIRATION_DATE",
                ValidityMonths: null,
                PdfOrder: 0,
                PdfColumnLabel: null,
                IncludeInPdf: false,
            },
            ctx,
        );

        const updated = await prisma.formOptions.findUnique({where: {ID: opt!.ID}});
        expect(updated?.IncludeInPdf).toBe(true);
    });

    it("deletes a form option and its driver filings", async () => {
        const ctx = await createTestContextWithPrisma(prisma);
        const token = String(Date.now() % 1000000);
        const name = `${TEST_NAME_PREFIX}-DB-DEL-${token}`;
        const display = `${TEST_NAME_PREFIX} DB Delete ${token}`;

        const created = await callTrpcMutation<{ID: number}>(
            "formsCatalog.createWithOptions",
            {Name: name, DisplayName: display},
            ctx,
        );
        const opt = await prisma.formOptions.findFirst({where: {Form: created.ID}});
        expect(opt).toBeTruthy();

        const entities = await getBaseEntities(prisma);
        await callTrpcMutation(
            "driverForms.put",
            {
                Driver: entities.driver.ID,
                Form: created.ID,
                Expiration: new Date("2099-12-31"),
                FiledDate: new Date(),
            },
            ctx,
        );

        await callTrpcMutation(
            "formsCatalog.deleteWithOptions",
            {formOptionId: opt!.ID},
            ctx,
        );

        const remainingForm = await prisma.forms.findUnique({where: {ID: created.ID}});
        const remainingFilings = await prisma.driverForms.findMany({where: {Form: created.ID}});
        expect(remainingForm).toBeNull();
        expect(remainingFilings).toHaveLength(0);
    });
});

describe("compliance trackers after form configuration (dev DB via tRPC)", () => {
    it("summary and expiring-soon reflect a filed near-term expiration", async () => {
        const entities = await getBaseEntities(prisma);
        const ctx = await createTestContextWithPrisma(prisma);

        let form = await prisma.forms.findFirst({
            where: {
                DisplayName: {startsWith: `${TEST_NAME_PREFIX} DB Tracker`},
            },
            orderBy: {ID: "desc"},
        });
        if (!form) {
            form = await prisma.forms.create({
                data: {
                    Name: `${TEST_NAME_PREFIX}-DB-EXP-${Date.now() % 100000}`,
                    DisplayName: `${TEST_NAME_PREFIX} DB Tracker Exp`,
                },
            });
            tracker.track("forms", form.ID);
            const opt = await prisma.formOptions.create({
                data: {
                    Form: form.ID,
                    W2Visible: true,
                    W2Required: false,
                    ExpiryCadence: "EXPIRATION_DATE",
                },
            });
            tracker.track("formOptions", opt.ID);
        }

        const exp = new Date();
        exp.setDate(exp.getDate() + 12);
        exp.setHours(12, 0, 0, 0);
        const filed = new Date();
        filed.setHours(12, 0, 0, 0);

        await callTrpcMutation(
            "driverForms.put",
            {
                Driver: entities.driver.ID,
                Form: form.ID,
                Expiration: exp,
                FiledDate: filed,
            },
            ctx,
        );
        tracker.trackDriverForm(entities.driver.ID, form.ID);

        const summary = await callTrpcQuery<{
            w2Issues: number;
            ooIssues: number;
            expiringSoonTotal: number;
            totalIssues: number;
        }>("compliance.driverFormsSummary", undefined, ctx);
        expect(typeof summary.w2Issues).toBe("number");
        expect(typeof summary.expiringSoonTotal).toBe("number");
        expect(summary.expiringSoonTotal).toBeGreaterThanOrEqual(0);

        const expiring = await callTrpcQuery<{
            daysAhead: number;
            w2Groups: {driverId: number; rows: {formName: string}[]}[];
        }>("compliance.driverFormsExpiringSoon", undefined, ctx);
        expect(expiring.daysAhead).toBe(30);
        const names = expiring.w2Groups.flatMap((g) => g.rows.map((r) => r.formName));
        expect(names.some((n) => n.includes("Tracker") || n === form!.DisplayName)).toBe(true);
    });
});
