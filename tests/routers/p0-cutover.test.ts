import {afterEach, describe, expect, it, vi} from "vitest";
import {createPrismaMock} from "../helpers/prismaMock";
import {baseLoadMutationInput, setupRematchMocks} from "../helpers/rematchMocks";
import {callTrpcMutation, callTrpcQuery, createTestContext} from "../helpers/trpcCaller";
describe("config router", () => {
    it("returns sources cutover config", async () => {
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{
            active: boolean;
            newLoadTypeIdThreshold: number;
        }>("config.sourcesCutover", undefined, ctx);
        expect(result.newLoadTypeIdThreshold).toBe(10000);
        expect(typeof result.active).toBe("boolean");
    });
});

describe("loads.openLegacyJobs", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
    });

    it("returns empty when cutover inactive", async () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<unknown[]>(
            "loads.openLegacyJobs",
            {DriverID: 1, Week: "2026-W30"},
            ctx,
        );
        expect(result).toEqual([]);
        expect(prisma.dailies.findFirst).not.toHaveBeenCalled();
    });

    it("queries legacy jobs when cutover active", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.jobs.findMany.mockResolvedValue([
            {
                ID: 100,
                CustomerID: 1,
                LoadTypeID: 116,
                DeliveryLocationID: 2,
                TruckingRate: 10,
                MaterialRate: 5,
                DriverRate: 8,
                CompanyRate: 15,
                Customers: {ID: 1, Name: "Acme"},
                LoadTypes: {ID: 116, Description: "ASPHALT (FRUITLAND)"},
                DeliveryLocations: {ID: 2, Description: "Site A"},
                Dailies: {Week: "2026-W30"},
                Loads: [{StartDate: new Date("2026-07-20")}],
            },
        ] as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<
            {JobID: number; LoadTypeDescription: string}[]
        >("loads.openLegacyJobs", {DriverID: 1, Week: "2026-W30"}, ctx);
        expect(result).toHaveLength(1);
        expect(result[0]?.JobID).toBe(100);
        expect(result[0]?.Week).toBe("2026-W30");
        expect(prisma.jobs.findMany).toHaveBeenCalled();
        expect(prisma.dailies.findFirst).not.toHaveBeenCalled();
    });

    it("filters by customer only when driver and week omitted", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.jobs.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("loads.openLegacyJobs", {CustomerID: 5}, ctx);
        expect(prisma.jobs.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    CustomerID: 5,
                    Loads: expect.objectContaining({
                        some: expect.objectContaining({
                            StartDate: expect.objectContaining({gte: expect.any(Date)}),
                        }),
                    }),
                }),
            }),
        );
    });

    it("excludes jobs without a recent ticket", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.jobs.findMany.mockResolvedValue([
            {
                ID: 100,
                CustomerID: 1,
                LoadTypeID: 116,
                DeliveryLocationID: 2,
                TruckingRate: 10,
                MaterialRate: 5,
                DriverRate: 8,
                CompanyRate: 15,
                Customers: {ID: 1, Name: "Acme"},
                LoadTypes: {ID: 116, Description: "ASPHALT (FRUITLAND)"},
                DeliveryLocations: {ID: 2, Description: "Site A"},
                Dailies: {Week: "2026-W30"},
                Loads: [],
            },
            {
                ID: 101,
                CustomerID: 1,
                LoadTypeID: 116,
                DeliveryLocationID: 2,
                TruckingRate: 10,
                MaterialRate: 5,
                DriverRate: 8,
                CompanyRate: 15,
                Customers: {ID: 1, Name: "Acme"},
                LoadTypes: {ID: 116, Description: "ASPHALT (FRUITLAND)"},
                DeliveryLocations: {ID: 2, Description: "Site A"},
                Dailies: {Week: "2026-W30"},
                Loads: [{StartDate: new Date("2020-01-01")}],
            },
            {
                ID: 102,
                CustomerID: 1,
                LoadTypeID: 116,
                DeliveryLocationID: 2,
                TruckingRate: 10,
                MaterialRate: 5,
                DriverRate: 8,
                CompanyRate: 15,
                Customers: {ID: 1, Name: "Acme"},
                LoadTypes: {ID: 116, Description: "ASPHALT (FRUITLAND)"},
                DeliveryLocations: {ID: 2, Description: "Site A"},
                Dailies: {Week: "2026-W30"},
                Loads: [{StartDate: new Date("2026-07-20")}],
            },
        ] as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{JobID: number}[]>(
            "loads.openLegacyJobs",
            {DriverID: 1, Week: "2026-W30"},
            ctx,
        );
        expect(result).toHaveLength(1);
        expect(result[0]?.JobID).toBe(102);
    });
});

describe("reports.sourceAudit", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
    });

    it("forbidden when cutover inactive", async () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        await expect(
            callTrpcQuery("reports.sourceAudit", {
                sourceId: 1,
                startDate: new Date("2024-01-01"),
                endDate: new Date("2024-01-31"),
            }, ctx),
        ).rejects.toThrow(/cutover/i);
    });

    it("filters by Loads.SourceID when cutover active", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.sources.findUnique.mockResolvedValue({ID: 5, Name: "Fruitland", ShortName: "FRUIT"} as never);
        prisma.loads.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("reports.sourceAudit", {
            sourceId: 5,
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-01-31"),
        }, ctx);
        expect(prisma.loads.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({SourceID: 5}),
            }),
        );
    });
});

describe("sources mutations gate", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
    });

    it("blocks create when cutover inactive", async () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        await expect(
            callTrpcMutation(
                "sources.put",
                {Name: "Test Source", ShortName: "TS"},
                ctx,
            ),
        ).rejects.toThrow(/cutover/i);
    });
});

describe("loadtypes.search era filter", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
        vi.restoreAllMocks();
    });

    it("restricts to legacy IDs when cutover inactive", async () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
        const prisma = createPrismaMock();
        prisma.loadTypes.findMany.mockResolvedValue([] as never);
        prisma.customerLoadTypes.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("loadtypes.search", {era: "new"}, ctx);
        const calls = prisma.loadTypes.findMany.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const firstWhere = calls[0]?.[0]?.where as {ID?: {lt?: number; gte?: number}};
        expect(firstWhere?.ID?.lt).toBe(10000);
    });

    it("marks OpenJob load types when IDs provided", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.loadTypes.findMany.mockResolvedValue([
            {ID: 116, Description: "ASPHALT", Deleted: false, Notes: null},
        ] as never);
        prisma.customerLoadTypes.findMany.mockResolvedValue([] as never);
        prisma.sourceLoadTypes.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{Recommend: string; ID: number}[]>(
            "loadtypes.search",
            {OpenJobLoadTypeIDs: [116], era: "legacy"},
            ctx,
        );
        expect(result[0]?.Recommend).toBe("OpenJob");
    });

    it("does not pull legacy customer-linked types into new-era search", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.loadTypes.findMany
            .mockResolvedValueOnce([
                {ID: 10001, Description: "CLEAN TYPE", Deleted: false, Notes: null},
            ] as never)
            .mockResolvedValueOnce([] as never);
        prisma.customerLoadTypes.findMany.mockResolvedValue([
            {LoadTypeID: 116},
        ] as never);
        prisma.sourceLoadTypes.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{ID: number}[]>(
            "loadtypes.search",
            {CustomerID: 1, era: "new"},
            ctx,
        );
        expect(result.every((row) => row.ID >= 10000)).toBe(true);
        expect(result.some((row) => row.ID === 116)).toBe(false);
        const extraCalls = prisma.loadTypes.findMany.mock.calls.filter(
            (call) => (call[0]?.where as {AND?: {ID?: {in?: number[]}}[]})?.AND?.some(
                (clause) => Array.isArray(clause?.ID?.in) && clause.ID.in.includes(116),
            ),
        );
        expect(extraCalls).toHaveLength(0);
    });
});

describe("loads.put cutover gate", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
    });

    it("strips SourceID on create when cutover inactive", async () => {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
        const prisma = createPrismaMock();
        setupRematchMocks(prisma);
        prisma.trucksDriven.create.mockResolvedValue({} as never);
        prisma.customerLoadTypes.create.mockResolvedValue({} as never);
        prisma.customerDeliveryLocations.create.mockResolvedValue({} as never);
        prisma.loads.create.mockImplementation(async ({data}) => ({...data, ID: 50}) as never);
        const ctx = await createTestContext(prisma);
        await callTrpcMutation(
            "loads.put",
            {...baseLoadMutationInput, SourceID: 99},
            ctx,
        );
        const createArg = prisma.loads.create.mock.calls[0]?.[0]?.data as {SourceID?: number};
        expect(createArg?.SourceID).toBeUndefined();
    });

    it("persists SourceID for new-era load types when cutover active", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        setupRematchMocks(prisma, 200);
        prisma.trucksDriven.create.mockResolvedValue({} as never);
        prisma.customerLoadTypes.create.mockResolvedValue({} as never);
        prisma.customerDeliveryLocations.create.mockResolvedValue({} as never);
        prisma.sourceLoadTypes.upsert.mockResolvedValue({} as never);
        prisma.loads.create.mockImplementation(async ({data}) => ({...data, ID: 51}) as never);
        const ctx = await createTestContext(prisma);
        await callTrpcMutation(
            "loads.put",
            {...baseLoadMutationInput, LoadTypeID: 10001, SourceID: 5},
            ctx,
        );
        const createArg = prisma.loads.create.mock.calls[0]?.[0]?.data as {SourceID?: number};
        expect(createArg?.SourceID).toBe(5);
        expect(prisma.sourceLoadTypes.upsert).toHaveBeenCalled();
    });
});

describe("loads.post_mass_edit", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
    });

    it("updates selected loads via mass edit", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        setupRematchMocks(prisma, 300);
        prisma.loads.findMany.mockResolvedValue([
            {
                ID: 10,
                JobID: 1,
                DriverID: 1,
                TruckID: 2,
                StartDate: new Date("2026-07-20"),
                CustomerID: 3,
                LoadTypeID: 10001,
                DeliveryLocationID: 4,
            },
            {
                ID: 11,
                JobID: 1,
                DriverID: 1,
                TruckID: 2,
                StartDate: new Date("2026-07-20"),
                CustomerID: 3,
                LoadTypeID: 10001,
                DeliveryLocationID: 4,
            },
        ] as never);
        prisma.loads.updateMany.mockResolvedValue({count: 2} as never);
        prisma.sourceLoadTypes.upsert.mockResolvedValue({} as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcMutation(
            "loads.post_mass_edit",
            {
                selectedLoads: [10, 11],
                data: {...baseLoadMutationInput, LoadTypeID: 10001, SourceID: 7},
            },
            ctx,
        );
        expect(result).toEqual({ok: true, warnings: []});
        expect(prisma.loads.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {ID: {in: [10, 11]}},
                data: expect.objectContaining({SourceID: 7, JobID: 300}),
            }),
        );
    });
});
