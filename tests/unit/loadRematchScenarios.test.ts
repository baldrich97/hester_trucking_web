import {afterEach, describe, expect, it} from "vitest";
import {rematchLoadToJob, type RematchInput} from "../../src/server/loadRematch";

/**
 * Minimal in-memory Prisma stub so we can run rematchLoadToJob through realistic
 * multi-call sequences and assert no duplicate weeklies/dailies/jobs are created.
 */
function createRematchStatePrisma() {
    let dailyId = 100;
    let weeklyId = 200;
    let jobId = 300;

    const dailies: Array<{ID: number; DriverID: number; Week: string}> = [];
    const weeklies: Array<{
        ID: number;
        Week: string;
        CustomerID: number;
        LoadTypeID: number;
        DeliveryLocationID: number;
        CompanyRate: number | null;
        InvoiceID: number | null;
        Revenue: number | null;
        SourceID: number | null;
    }> = [];
    const jobs: Array<{
        ID: number;
        DriverID: number;
        CustomerID: number;
        LoadTypeID: number;
        DeliveryLocationID: number;
        DailyID: number;
        WeeklyID: number;
        TruckingRate: number;
        MaterialRate: number;
        DriverRate: number;
        CompanyRate: number;
        PaidOut: boolean;
        TruckingRevenue: number | null;
        CompanyRevenue: number | null;
        SourceID: number | null;
    }> = [];

    const matchWhere = <T extends Record<string, unknown>>(row: T, where: Record<string, unknown>) =>
        Object.entries(where).every(([key, value]) => {
            const rowVal = row[key as keyof T];
            if (value && typeof value === "object" && "not" in (value as object)) {
                return rowVal !== (value as {not: unknown}).not;
            }
            return rowVal === value;
        });

    const prisma = {
        dailies: {
            findFirst: async ({where}: {where: {DriverID: number; Week: string}}) =>
                dailies.find((d) => matchWhere(d, where)) ?? null,
            create: async ({data}: {data: {DriverID: number; Week: string}}) => {
                const row = {ID: ++dailyId, ...data};
                dailies.push(row);
                return row;
            },
        },
        weeklies: {
            findMany: async ({where}: {where: Record<string, unknown>}) =>
                weeklies.filter((w) => matchWhere(w, where)),
            create: async ({data}: {
                data: {
                    Week: string;
                    CustomerID: number;
                    LoadTypeID: number;
                    DeliveryLocationID: number;
                    CompanyRate: number;
                    SourceID: number | null;
                };
            }) => {
                const row = {
                    ID: ++weeklyId,
                    InvoiceID: null,
                    Revenue: null,
                    ...data,
                };
                weeklies.push(row);
                return row;
            },
        },
        jobs: {
            findMany: async ({where}: {where: Record<string, unknown>}) =>
                jobs.filter((j) => matchWhere(j, where)),
            create: async ({data}: {
                data: {
                    DriverID: number;
                    CustomerID: number;
                    LoadTypeID: number;
                    DeliveryLocationID: number;
                    DailyID: number;
                    WeeklyID: number;
                    TruckingRate: number;
                    MaterialRate: number;
                    DriverRate: number;
                    CompanyRate: number;
                    SourceID: number | null;
                };
            }) => {
                const row = {
                    ID: ++jobId,
                    PaidOut: false,
                    TruckingRevenue: null,
                    CompanyRevenue: null,
                    ...data,
                };
                jobs.push(row);
                return row;
            },
        },
        $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    };

    return {prisma, dailies, weeklies, jobs};
}

const baseInput: RematchInput = {
    DriverID: 2,
    CustomerID: 201,
    LoadTypeID: 10000,
    DeliveryLocationID: 2255,
    Week: "2026-W31",
    TruckRate: 7.26,
    MaterialRate: 0,
    DriverRate: 6.5,
    TotalRate: 7.26,
};

describe("rematchLoadToJob multi-call scenarios (in-memory)", () => {
    const env = process.env;

    afterEach(() => {
        process.env = {...env};
    });

    it("regression: second driver reuses weekly created by first driver (no-daily path)", async () => {
        const {prisma, weeklies, dailies, jobs} = createRematchStatePrisma();
        const ctx = {prisma, warnings: [] as string[]};

        const r1 = await rematchLoadToJob(ctx, {...baseInput, DriverID: 2});
        const r2 = await rematchLoadToJob(ctx, {...baseInput, DriverID: 74});
        const r3 = await rematchLoadToJob(ctx, {...baseInput, DriverID: 74});

        expect(weeklies).toHaveLength(1);
        expect(dailies).toHaveLength(2);
        expect(jobs).toHaveLength(2);

        const weekly = weeklies[0]!;
        expect(jobs.every((j) => j.WeeklyID === weekly.ID)).toBe(true);
        expect(jobs.find((j) => j.ID === r1.JobID)?.DriverID).toBe(2);
        expect(jobs.find((j) => j.ID === r2.JobID)?.DriverID).toBe(74);
        expect(r3.JobID).toBe(r2.JobID);
    });

    it("regression: five drivers on same weekly each get one daily and one job", async () => {
        const {prisma, weeklies, dailies, jobs} = createRematchStatePrisma();
        const ctx = {prisma, warnings: [] as string[]};
        const drivers = [2, 74, 30, 28, 55];

        for (const driverId of drivers) {
            await rematchLoadToJob(ctx, {...baseInput, DriverID: driverId});
        }

        expect(weeklies).toHaveLength(1);
        expect(dailies).toHaveLength(5);
        expect(jobs).toHaveLength(5);

        for (const driverId of drivers) {
            expect(dailies.filter((d) => d.DriverID === driverId)).toHaveLength(1);
            expect(jobs.filter((j) => j.DriverID === driverId)).toHaveLength(1);
        }
    });

    it("creates separate weeklies for different rates (by design, not a duplicate bug)", async () => {
        const {prisma, weeklies, jobs} = createRematchStatePrisma();
        const ctx = {prisma, warnings: [] as string[]};

        await rematchLoadToJob(ctx, baseInput);
        await rematchLoadToJob(ctx, {...baseInput, TotalRate: 8.5, TruckRate: 8.5});

        expect(weeklies).toHaveLength(2);
        expect(jobs).toHaveLength(2);
        expect(new Set(jobs.map((j) => j.WeeklyID)).size).toBe(2);
    });

    it("creates separate weeklies when existing weekly is closed (by design)", async () => {
        const {prisma, weeklies} = createRematchStatePrisma();
        const ctx = {prisma, warnings: [] as string[]};

        await rematchLoadToJob(ctx, baseInput);
        weeklies[0]!.Revenue = 999;

        await rematchLoadToJob(ctx, {...baseInput, DriverID: 9});

        expect(weeklies).toHaveLength(2);
        expect(weeklies.filter((w) => w.Revenue === null)).toHaveLength(1);
    });

    it("reuses open job on second load for same driver when daily exists", async () => {
        const {prisma, jobs} = createRematchStatePrisma();
        const ctx = {prisma, warnings: [] as string[]};

        const first = await rematchLoadToJob(ctx, baseInput);
        const second = await rematchLoadToJob(ctx, baseInput);

        expect(jobs).toHaveLength(1);
        expect(second.JobID).toBe(first.JobID);
    });

    it("creates new job when rates differ on same driver/daily/weekly", async () => {
        const {prisma, jobs} = createRematchStatePrisma();
        const ctx = {prisma, warnings: [] as string[]};

        const first = await rematchLoadToJob(ctx, baseInput);
        const second = await rematchLoadToJob(ctx, {...baseInput, TotalRate: 8.5, TruckRate: 8.5});

        expect(jobs).toHaveLength(2);
        expect(second.JobID).not.toBe(first.JobID);
        expect(jobs[0]!.WeeklyID).not.toBe(jobs[1]!.WeeklyID);
    });
});
