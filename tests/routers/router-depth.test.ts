import {afterEach, describe, expect, it} from "vitest";
import {createPrismaMock} from "../helpers/prismaMock";
import {callTrpcQuery, createTestContext} from "../helpers/trpcCaller";
import {rematchLoadToJob} from "../../src/server/loadRematch";

const env = process.env;

afterEach(() => {
    process.env = {...env};
});

// ---------------------------------------------------------------------------
// trucksdriven.search
// ---------------------------------------------------------------------------

describe("trucksdriven.search", () => {
    it("returns recommended drivers for a truck plus the top driver list", async () => {
        const prisma = createPrismaMock();
        prisma.trucksDriven.findMany.mockResolvedValue([
            {
                TruckID: 3,
                DriverID: 1,
                Trucks: {ID: 3, Name: "Truck A"},
                Drivers: {ID: 1, FirstName: "Recommended", LastName: "Driver"},
            },
        ] as never);
        prisma.drivers.findMany.mockResolvedValue([
            {ID: 2, FirstName: "Plain", LastName: "Driver"},
        ] as never);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<
            Array<{Drivers?: {ID: number; Recommend?: boolean}}>
        >("trucksdriven.search", {TruckID: 3}, ctx);

        expect(result).toHaveLength(2);
        expect(result[0]?.Drivers?.Recommend).toBe(true);
        expect(result[1]?.Drivers?.ID).toBe(2);
        expect(prisma.trucksDriven.findMany).toHaveBeenCalledWith(
            expect.objectContaining({where: {TruckID: 3}}),
        );
        expect(prisma.trucks.findMany).not.toHaveBeenCalled();
    });

    it("returns recommended trucks for a driver plus the top truck list", async () => {
        const prisma = createPrismaMock();
        prisma.trucksDriven.findMany.mockResolvedValue([
            {
                TruckID: 3,
                DriverID: 1,
                Trucks: {ID: 3, Name: "Truck A"},
                Drivers: {ID: 1, FirstName: "Test", LastName: "Driver"},
            },
        ] as never);
        prisma.trucks.findMany.mockResolvedValue([
            {ID: 4, Name: "Truck B"},
        ] as never);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<
            Array<{Trucks?: {ID: number; Recommend?: boolean}}>
        >("trucksdriven.search", {DriverID: 1}, ctx);

        expect(result).toHaveLength(2);
        expect(result[0]?.Trucks?.Recommend).toBe(true);
        expect(prisma.drivers.findMany).not.toHaveBeenCalled();
    });

    it("dedupes a shared pair when both truck and driver are given", async () => {
        const prisma = createPrismaMock();
        const pair = {
            TruckID: 3,
            DriverID: 1,
            Trucks: {ID: 3, Name: "Truck A"},
            Drivers: {ID: 1, FirstName: "Test", LastName: "Driver"},
        };
        prisma.trucksDriven.findMany
            .mockResolvedValueOnce([pair] as never)
            .mockResolvedValueOnce([pair] as never);
        prisma.drivers.findMany.mockResolvedValue([] as never);
        prisma.trucks.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<
            Array<{
                Drivers?: {Recommend?: boolean};
                Trucks?: {Recommend?: boolean};
            }>
        >("trucksdriven.search", {TruckID: 3, DriverID: 1}, ctx);

        // One deduped pair with both sides recommended.
        expect(result).toHaveLength(1);
        expect(result[0]?.Drivers?.Recommend).toBe(true);
        expect(result[0]?.Trucks?.Recommend).toBe(true);
    });

    it("returns empty when neither truck nor driver is given", async () => {
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<unknown[]>("trucksdriven.search", {}, ctx);
        expect(result).toEqual([]);
        expect(prisma.trucksDriven.findMany).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// reports audit edge cases
// ---------------------------------------------------------------------------

function makeAuditLoad(overrides: Record<string, unknown> = {}) {
    return {
        ID: 10,
        StartDate: new Date("2024-01-05T12:00:00.000Z"),
        TicketNumber: 999601,
        Weight: 20,
        TotalAmount: 300,
        TotalRate: 15,
        MaterialRate: 5,
        TruckRate: 10,
        DriverRate: 8,
        LoadTypeID: 10001,
        LoadTypes: {ID: 10001, Description: "Gravel"},
        Sources: null,
        CustomerID: 4,
        Customers: {ID: 4, Name: "[TEST] Customer"},
        DeliveryLocationID: 5,
        DeliveryLocations: {ID: 5, Description: "[TEST] Site"},
        ...overrides,
    };
}

describe("reports.sourceAudit edge cases", () => {
    it("rejects start date after end date", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        await expect(
            callTrpcQuery("reports.sourceAudit", {
                sourceId: 1,
                startDate: new Date("2024-02-01"),
                endDate: new Date("2024-01-01"),
            }, ctx),
        ).rejects.toThrow(/start date/i);
    });

    it("returns an empty report when the source does not exist", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.sources.findUnique.mockResolvedValue(null as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{
            source: unknown;
            rows: unknown[];
            summary: {totalLoads: number};
        }>("reports.sourceAudit", {
            sourceId: 999999,
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-01-31"),
        }, ctx);
        expect(result.source).toBeNull();
        expect(result.rows).toEqual([]);
        expect(result.summary.totalLoads).toBe(0);
        expect(prisma.loads.findMany).not.toHaveBeenCalled();
    });

    it("groups the summary by load type and sorts alphabetically", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.sources.findUnique.mockResolvedValue({
            ID: 5,
            Name: "Fruitland",
            ShortName: "FRUIT",
        } as never);
        prisma.loads.findMany.mockResolvedValue([
            makeAuditLoad({ID: 11, LoadTypes: {ID: 10002, Description: "Sand"}, Weight: 10, TotalAmount: 100}),
            makeAuditLoad({ID: 12, Weight: 20, TotalAmount: 300}),
            makeAuditLoad({ID: 13, Weight: 30, TotalAmount: 400}),
        ] as never);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<{
            rows: unknown[];
            summary: {
                totalLoads: number;
                totalTonnage: number;
                totalAmount: number;
                byLoadType: Array<{loadType: string; totalLoads: number; totalTonnage: number; totalAmount: number}>;
            };
        }>("reports.sourceAudit", {
            sourceId: 5,
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-01-31"),
        }, ctx);

        expect(result.summary.totalLoads).toBe(3);
        expect(result.summary.totalTonnage).toBe(60);
        expect(result.summary.totalAmount).toBe(800);
        expect(result.summary.byLoadType.map((g) => g.loadType)).toEqual(["Gravel", "Sand"]);
        expect(result.summary.byLoadType[0]).toMatchObject({
            totalLoads: 2,
            totalTonnage: 50,
            totalAmount: 700,
        });
    });
});

describe("reports.customerAudit edge cases", () => {
    it("forbidden when cutover inactive", async () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        await expect(
            callTrpcQuery("reports.customerAudit", {
                customerId: 1,
                startDate: new Date("2024-01-01"),
                endDate: new Date("2024-01-31"),
            }, ctx),
        ).rejects.toThrow(/cutover/i);
    });

    it("rejects start date after end date", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        await expect(
            callTrpcQuery("reports.customerAudit", {
                customerId: 1,
                startDate: new Date("2024-02-01"),
                endDate: new Date("2024-01-01"),
            }, ctx),
        ).rejects.toThrow(/start date/i);
    });

    it("returns an empty report when the customer does not exist", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.customers.findUnique.mockResolvedValue(null as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{
            customer: unknown;
            rows: unknown[];
        }>("reports.customerAudit", {
            customerId: 999999,
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-01-31"),
        }, ctx);
        expect(result.customer).toBeNull();
        expect(result.rows).toEqual([]);
    });

    it("filters loads by CustomerID and date range", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.customers.findUnique.mockResolvedValue({ID: 4, Name: "[TEST] Customer"} as never);
        prisma.loads.findMany.mockResolvedValue([makeAuditLoad()] as never);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<{
            rows: Array<{Customer: string}>;
            summary: {totalLoads: number};
        }>("reports.customerAudit", {
            customerId: 4,
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-01-31"),
        }, ctx);

        expect(result.summary.totalLoads).toBe(1);
        expect(result.rows[0]?.Customer).toBe("[TEST] Customer");
        expect(prisma.loads.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({CustomerID: 4}),
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// loadRematch existing-daily branches (lines 88–162)
// ---------------------------------------------------------------------------

const rematchInput = {
    DriverID: 1,
    CustomerID: 3,
    LoadTypeID: 116,
    DeliveryLocationID: 4,
    Week: "2026-W30",
    TruckRate: 10,
    MaterialRate: 5,
    DriverRate: 8,
    TotalRate: 15,
};

describe("rematchLoadToJob with an existing daily", () => {
    it("reuses the matching weekly and job when all rates match", async () => {
        const prisma = createPrismaMock();
        prisma.dailies.findFirst.mockResolvedValue({ID: 30, DriverID: 1, Week: "2026-W30"} as never);
        prisma.weeklies.findMany.mockResolvedValue([{ID: 40, CompanyRate: 15}] as never);
        prisma.jobs.findMany.mockResolvedValue([
            {
                ID: 100,
                TruckingRate: 10,
                MaterialRate: 5,
                DriverRate: 8,
                CompanyRate: 15,
                PaidOut: false,
                TruckingRevenue: null,
                CompanyRevenue: null,
            },
        ] as never);

        const result = await rematchLoadToJob({prisma}, rematchInput);

        expect(result.JobID).toBe(100);
        expect(prisma.weeklies.create).not.toHaveBeenCalled();
        expect(prisma.jobs.create).not.toHaveBeenCalled();
        expect(prisma.dailies.create).not.toHaveBeenCalled();
    });

    it("creates a new job when the only matching job is already paid out", async () => {
        const prisma = createPrismaMock();
        prisma.dailies.findFirst.mockResolvedValue({ID: 30} as never);
        prisma.weeklies.findMany.mockResolvedValue([{ID: 40, CompanyRate: 15}] as never);
        prisma.jobs.findMany.mockResolvedValue([]);
        prisma.jobs.create.mockResolvedValue({ID: 104} as never);

        const result = await rematchLoadToJob({prisma}, rematchInput);

        expect(result.JobID).toBe(104);
        expect(prisma.jobs.create).toHaveBeenCalled();
    });

    it("creates a new weekly when no weekly matches the total rate", async () => {
        const prisma = createPrismaMock();
        prisma.dailies.findFirst.mockResolvedValue({ID: 30} as never);
        prisma.weeklies.findMany.mockResolvedValue([{ID: 40, CompanyRate: 99}] as never);
        prisma.weeklies.create.mockResolvedValue({ID: 41, CompanyRate: 15} as never);
        prisma.jobs.findMany.mockResolvedValue([] as never);
        prisma.jobs.create.mockResolvedValue({ID: 101} as never);

        const result = await rematchLoadToJob({prisma}, rematchInput);

        expect(result.JobID).toBe(101);
        expect(prisma.weeklies.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({CompanyRate: 15, Week: "2026-W30"}),
            }),
        );
    });

    it("creates a new job when existing jobs have different rates", async () => {
        const prisma = createPrismaMock();
        prisma.dailies.findFirst.mockResolvedValue({ID: 30} as never);
        prisma.weeklies.findMany.mockResolvedValue([{ID: 40, CompanyRate: 15}] as never);
        prisma.jobs.findMany.mockResolvedValue([
            {
                ID: 100,
                TruckingRate: 12, // differs -> no reuse
                MaterialRate: 5,
                DriverRate: 8,
                CompanyRate: 15,
                PaidOut: false,
                TruckingRevenue: null,
                CompanyRevenue: null,
            },
        ] as never);
        prisma.jobs.create.mockResolvedValue({ID: 102} as never);

        const result = await rematchLoadToJob({prisma}, rematchInput);

        expect(result.JobID).toBe(102);
        expect(prisma.jobs.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    TruckingRate: 10,
                    WeeklyID: 40,
                    DailyID: 30,
                }),
            }),
        );
    });

    it("scopes weekly and job matching by SourceID for new-era load types", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.dailies.findFirst.mockResolvedValue({ID: 30} as never);
        prisma.weeklies.findMany.mockResolvedValue([] as never);
        prisma.weeklies.create.mockResolvedValue({ID: 42} as never);
        prisma.jobs.findMany.mockResolvedValue([] as never);
        prisma.jobs.create.mockResolvedValue({ID: 103} as never);

        const result = await rematchLoadToJob({prisma}, {
            ...rematchInput,
            LoadTypeID: 10001,
            SourceID: 7,
        });

        expect(result).toEqual({JobID: 103, SourceID: 7});
        expect(prisma.weeklies.findMany).toHaveBeenCalledWith(
            expect.objectContaining({where: expect.objectContaining({SourceID: 7})}),
        );
        expect(prisma.jobs.findMany).toHaveBeenCalledWith(
            expect.objectContaining({where: expect.objectContaining({SourceID: 7})}),
        );
        expect(prisma.jobs.create).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({SourceID: 7})}),
        );
    });
});

describe("rematchLoadToJob with no existing daily", () => {
    it("reuses an existing open weekly instead of creating a duplicate", async () => {
        const prisma = createPrismaMock();
        prisma.dailies.findFirst.mockResolvedValue(null);
        prisma.weeklies.findMany.mockResolvedValue([{ID: 40, CompanyRate: 15}] as never);
        prisma.dailies.create.mockResolvedValue({ID: 31, DriverID: 5, Week: "2026-W30"} as never);
        prisma.jobs.create.mockResolvedValue({ID: 105} as never);

        const result = await rematchLoadToJob({prisma}, {
            ...rematchInput,
            DriverID: 5,
        });

        expect(result.JobID).toBe(105);
        expect(prisma.weeklies.findMany).toHaveBeenCalled();
        expect(prisma.weeklies.create).not.toHaveBeenCalled();
        expect(prisma.jobs.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    WeeklyID: 40,
                    DailyID: 31,
                    DriverID: 5,
                }),
            }),
        );
    });

    it("creates a weekly when no matching open weekly exists", async () => {
        const prisma = createPrismaMock();
        prisma.dailies.findFirst.mockResolvedValue(null);
        prisma.weeklies.findMany.mockResolvedValue([] as never);
        prisma.weeklies.create.mockResolvedValue({ID: 43, CompanyRate: 15} as never);
        prisma.dailies.create.mockResolvedValue({ID: 32, DriverID: 6, Week: "2026-W30"} as never);
        prisma.jobs.create.mockResolvedValue({ID: 106} as never);

        const result = await rematchLoadToJob({prisma}, {
            ...rematchInput,
            DriverID: 6,
        });

        expect(result.JobID).toBe(106);
        expect(prisma.weeklies.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({CompanyRate: 15, Week: "2026-W30"}),
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// dailies W2 / operator queries
// ---------------------------------------------------------------------------

describe("dailies.getByWeekW2", () => {
    it("pages raw not-paid W2 dailies and hydrates them", async () => {
        const prisma = createPrismaMock();
        prisma.$queryRaw
            .mockResolvedValueOnce([{ID: 30}] as never)
            .mockResolvedValueOnce([{count: 1}] as never);
        prisma.dailies.findMany.mockResolvedValue([{ID: 30, Jobs: [], Drivers: {ID: 1}}] as never);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<{
            data: Array<{ID: number}>;
            warnings: string[];
        }>("dailies.getByWeekW2", {page: 1}, ctx);

        expect(result.data.map((d) => d.ID)).toEqual([30]);
        expect(result.warnings).toContain("1");
        expect(prisma.dailies.findMany).toHaveBeenCalledWith(
            expect.objectContaining({where: {ID: {in: [30]}}}),
        );
    });
});

describe("dailies.getByWeekOperator", () => {
    it("resolves dailies through paid invoices with unpaid operator jobs", async () => {
        const prisma = createPrismaMock();
        prisma.weeklies.findMany.mockResolvedValue([
            {
                ID: 40,
                Jobs: [
                    {DailyID: 30, PaidOut: false},
                    {DailyID: 31, PaidOut: true}, // paid job excluded from daily IDs
                ],
            },
        ] as never);
        prisma.dailies.findMany.mockResolvedValue([{ID: 30, Jobs: [], Drivers: {ID: 1}}] as never);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<{
            data: Array<{ID: number}>;
            warnings: number[];
        }>("dailies.getByWeekOperator", {page: 1}, ctx);

        expect(result.data.map((d) => d.ID)).toEqual([30]);
        expect(result.warnings).toEqual([1]);
        expect(prisma.dailies.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {ID: {in: [30]}},
                skip: 0,
                take: 10,
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// compliance expiring-soon windows
// ---------------------------------------------------------------------------

describe("compliance.driverFormsExpiringSoon windows", () => {
    function mockLicenseDriver(prisma: ReturnType<typeof createPrismaMock>, daysOut: number) {
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + daysOut);
        prisma.drivers.findMany.mockResolvedValue([
            {
                ID: 1,
                FirstName: "Test",
                LastName: "Driver",
                OwnerOperator: false,
                Deleted: false,
                License: "CDL-999",
                LicenseExpiration: expiration,
                DriverForms: [],
                TrucksDriven: [],
                Carriers: null,
                States: null,
            },
        ] as never);
        prisma.formOptions.findMany.mockResolvedValue([] as never);
    }

    it("includes a license expiring inside the window", async () => {
        const prisma = createPrismaMock();
        mockLicenseDriver(prisma, 10);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<{
            daysAhead: number;
            w2Groups: Array<{driverId: number; rows: Array<{formName: string}>}>;
        }>("compliance.driverFormsExpiringSoon", {daysAhead: 15}, ctx);

        expect(result.daysAhead).toBe(15);
        expect(result.w2Groups).toHaveLength(1);
        expect(result.w2Groups[0]?.rows[0]?.formName).toMatch(/license/i);
    });

    it("excludes a license outside the window", async () => {
        const prisma = createPrismaMock();
        mockLicenseDriver(prisma, 60);
        const ctx = await createTestContext(prisma);

        const result = await callTrpcQuery<{
            daysAhead: number;
            w2Groups: unknown[];
            ooGroups: unknown[];
        }>("compliance.driverFormsExpiringSoon", {daysAhead: 15}, ctx);

        expect(result.w2Groups).toHaveLength(0);
        expect(result.ooGroups).toHaveLength(0);
    });
});
