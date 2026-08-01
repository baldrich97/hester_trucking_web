import {afterEach, describe, expect, it} from "vitest";
import {FormExpiryCadence} from "@prisma/client";
import {createPrismaMock} from "../helpers/prismaMock";
import {callTrpcMutation, callTrpcQuery, createTestContext} from "../helpers/trpcCaller";

describe("states router", () => {
    it("getAll returns states", async () => {
        const prisma = createPrismaMock();
        prisma.states.findMany.mockResolvedValue([{ID: 1, Abbreviation: "MO"}] as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{ID: number}[]>("states.getAll", undefined, ctx);
        expect(result).toHaveLength(1);
    });
});

describe("compliance.driverFormsSummary", () => {
    it("returns summary shape", async () => {
        const prisma = createPrismaMock();
        prisma.drivers.findMany.mockResolvedValue([] as never);
        prisma.driverForms.findMany.mockResolvedValue([] as never);
        prisma.formOptions.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{
            totalIssues: number;
            w2Issues: number;
            ooIssues: number;
        }>("compliance.driverFormsSummary", undefined, ctx);
        expect(typeof result.totalIssues).toBe("number");
        expect(typeof result.w2Issues).toBe("number");
    });
});

describe("weeklies.getByWeek", () => {
    it("queries weeklies for a week", async () => {
        const prisma = createPrismaMock();
        prisma.weeklies.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("weeklies.getByWeek", {week: "2026-W30"}, ctx);
        expect(prisma.weeklies.findMany).toHaveBeenCalled();
    });
});

describe("invoices.getOverdueCount", () => {
    it("returns a number", async () => {
        const prisma = createPrismaMock();
        prisma.invoices.count.mockResolvedValue(3 as never);
        const ctx = await createTestContext(prisma);
        const count = await callTrpcQuery<number>("invoices.getOverdueCount", undefined, ctx);
        expect(count).toBe(3);
    });
});

describe("paystubs.getAll", () => {
    it("returns pay stubs", async () => {
        const prisma = createPrismaMock();
        prisma.payStubs.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<unknown[]>("paystubs.getAll", undefined, ctx);
        expect(Array.isArray(result)).toBe(true);
    });
});

describe("customers CRUD", () => {
    it("getAll returns customers", async () => {
        const prisma = createPrismaMock();
        prisma.customers.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("customers.getAll", undefined, ctx);
        expect(prisma.customers.findMany).toHaveBeenCalled();
    });
});

describe("drivers CRUD", () => {
    it("getAll returns drivers", async () => {
        const prisma = createPrismaMock();
        prisma.drivers.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("drivers.getAll", undefined, ctx);
        expect(prisma.drivers.findMany).toHaveBeenCalled();
    });
});

describe("trucks CRUD", () => {
    it("getAll returns trucks", async () => {
        const prisma = createPrismaMock();
        prisma.trucks.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("trucks.getAll", undefined, ctx);
        expect(prisma.trucks.findMany).toHaveBeenCalled();
    });
});

describe("deliverylocations CRUD", () => {
    it("getAll returns locations", async () => {
        const prisma = createPrismaMock();
        prisma.deliveryLocations.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("deliverylocations.getAll", undefined, ctx);
        expect(prisma.deliveryLocations.findMany).toHaveBeenCalled();
    });
});

describe("carriers CRUD", () => {
    it("getAll returns carriers", async () => {
        const prisma = createPrismaMock();
        prisma.carriers.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("carriers.getAll", undefined, ctx);
        expect(prisma.carriers.findMany).toHaveBeenCalled();
    });
});

describe("loadtypes CRUD", () => {
    it("getAll returns load types", async () => {
        const prisma = createPrismaMock();
        prisma.loadTypes.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("loadtypes.getAll", undefined, ctx);
        expect(prisma.loadTypes.findMany).toHaveBeenCalled();
    });
});

describe("dailies.getByWeek", () => {
    it("queries dailies", async () => {
        const prisma = createPrismaMock();
        prisma.dailies.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("dailies.getByWeek", {week: "2026-W30"}, ctx);
        expect(prisma.dailies.findMany).toHaveBeenCalled();
    });
});

describe("weeklies.post SourceID cascade", () => {
    it("cascades SourceID to jobs and loads", async () => {
        const prisma = createPrismaMock();
        prisma.weeklies.findUnique.mockResolvedValue({
            ID: 5,
            Revenue: null,
            InvoiceID: null,
        } as never);
        prisma.jobs.findMany.mockResolvedValue([{ID: 1}, {ID: 2}] as never);
        prisma.jobs.updateMany.mockResolvedValue({count: 2} as never);
        prisma.loads.updateMany.mockResolvedValue({count: 4} as never);
        prisma.weeklies.update.mockResolvedValue({ID: 5} as never);
        const ctx = await createTestContext(prisma);
        await callTrpcMutation(
            "weeklies.post",
            {
                ID: 5,
                Week: "2026-W30",
                CustomerID: 1,
                LoadTypeID: 116,
                DeliveryLocationID: 2,
                SourceID: 10,
            },
            ctx,
        );
        expect(prisma.jobs.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({SourceID: 10}),
            }),
        );
        expect(prisma.loads.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({SourceID: 10}),
            }),
        );
    });
});

describe("paystubs.put marks jobs paid", () => {
    it("creates paystub and marks selected jobs PaidOut", async () => {
        const prisma = createPrismaMock();
        prisma.jobs.findMany.mockResolvedValue([
            {ID: 42, DriverID: 1, PaidOut: false, PayStubID: null},
            {ID: 43, DriverID: 1, PaidOut: false, PayStubID: null},
        ] as never);
        prisma.payStubs.create.mockResolvedValue({ID: 99} as never);
        prisma.jobs.update.mockResolvedValue({ID: 1} as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcMutation(
            "paystubs.put",
            {
                Created: new Date(),
                DriverID: 1,
                CheckNumber: "TEST-001",
                Gross: 1000,
                Percentage: 0.25,
                NetTotal: 750,
                TakeHome: 750,
                Deductions: 0,
                Additions: 0,
                selected: ["42", "43"],
            },
            ctx,
        );
        expect(result).toBe(true);
        expect(prisma.jobs.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {ID: 42},
                data: {PayStubID: 99, PaidOut: true},
            }),
        );
    });
});

describe("driverForms.put", () => {
    it("upserts driver form with expiration cadence", async () => {
        const prisma = createPrismaMock();
        prisma.formOptions.findFirst.mockResolvedValue({
            ExpiryCadence: FormExpiryCadence.EXPIRATION_DATE,
        } as never);
        prisma.driverForms.upsert.mockResolvedValue({Driver: 1, Form: 2} as never);
        const ctx = await createTestContext(prisma);
        const expiration = new Date("2027-01-01");
        await callTrpcMutation(
            "driverForms.put",
            {
                Driver: 1,
                Form: 2,
                Expiration: expiration,
                FiledDate: new Date("2026-01-15"),
            },
            ctx,
        );
        expect(prisma.driverForms.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({
                    Expiration: expiration,
                }),
            }),
        );
    });
});

describe("invoices.put", () => {
    it("creates invoice and links weeklies", async () => {
        const prisma = createPrismaMock();
        prisma.invoices.findFirst.mockResolvedValue(null);
        prisma.invoices.create.mockResolvedValue({ID: 500, Number: 888001} as never);
        prisma.weeklies.updateMany.mockResolvedValue({count: 1} as never);
        prisma.jobs.findMany.mockResolvedValue([{ID: 10}] as never);
        prisma.loads.findMany.mockResolvedValue([{ID: 20}] as never);
        prisma.loads.updateMany.mockResolvedValue({count: 1} as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcMutation(
            "invoices.put",
            {
                Number: 888001,
                CustomerID: 1,
                InvoiceDate: new Date(),
                TotalAmount: 500,
                selected: ["15"],
            },
            ctx,
        );
        expect(result).toBe(true);
        expect(prisma.weeklies.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {InvoiceID: 500},
            }),
        );
        expect(prisma.loads.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {Invoiced: true, InvoiceID: 500},
            }),
        );
    });
});

describe("jobs.getAll", () => {
    it("returns jobs", async () => {
        const prisma = createPrismaMock();
        prisma.jobs.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("jobs.getAll", undefined, ctx);
        expect(prisma.jobs.findMany).toHaveBeenCalled();
    });
});
