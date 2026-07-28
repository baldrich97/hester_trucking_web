import {TRPCError} from "@trpc/server";

export function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function loadTotalAmount(
    weight: number | null | undefined,
    hours: number | null | undefined,
    totalRate: number | null | undefined,
): number {
    const quantity = weight ?? hours ?? 0;
    return roundMoney(quantity * (totalRate ?? 0));
}

const activeLoadWhere = {OR: [{Deleted: false}, {Deleted: null}]};

function asArray<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : [];
}

export {asArray};

/** Reject edits when any load belongs to a paid-out job. */
export async function assertLoadsNotPaidOut(ctx: any, loadIds: number[]): Promise<void> {
    if (!loadIds.length) {
        return;
    }

    const loads = asArray(await ctx.prisma.loads.findMany({
        where: {ID: {in: loadIds}},
        include: {Jobs: {select: {PaidOut: true}}},
    }));

    for (const load of loads) {
        if (load.Jobs?.PaidOut) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "This job has already been paid out.",
            });
        }
    }
}

export type SyncOpenSheetAmountsOptions = {
    loadIds?: number[];
    jobIds?: number[];
};

/**
 * After a load save: recalc per-load TotalAmount; update weekly TotalWeight only on open (uninvoiced) weeklies.
 * Never writes job revenues or closed weekly Revenue.
 */
export async function syncOpenSheetAmounts(ctx: any, options: SyncOpenSheetAmountsOptions): Promise<void> {
    const loadIds = options.loadIds ?? [];
    const jobIdSet = new Set<number>(options.jobIds ?? []);

    if (loadIds.length) {
        const loads = asArray(await ctx.prisma.loads.findMany({
            where: {ID: {in: loadIds}},
        }));

        await Promise.all(
            loads.map((load: {ID: number; Weight: number | null; Hours: number | null; TotalRate: number | null}) =>
                ctx.prisma.loads.update({
                    where: {ID: load.ID},
                    data: {
                        TotalAmount: loadTotalAmount(load.Weight, load.Hours, load.TotalRate),
                    },
                }),
            ),
        );

        const loadsWithJobs = asArray(await ctx.prisma.loads.findMany({
            where: {ID: {in: loadIds}},
            select: {JobID: true},
        }));
        for (const row of loadsWithJobs) {
            if (row.JobID) {
                jobIdSet.add(row.JobID);
            }
        }
    }

    const weeklyIds = new Set<number>();
    if (jobIdSet.size) {
        const jobs = asArray(await ctx.prisma.jobs.findMany({
            where: {ID: {in: [...jobIdSet]}},
            select: {WeeklyID: true},
        }));
        for (const job of jobs) {
            weeklyIds.add(job.WeeklyID);
        }
    }

    for (const weeklyId of weeklyIds) {
        const weekly = await ctx.prisma.weeklies.findUnique({where: {ID: weeklyId}});
        if (!weekly || weekly.Revenue !== null || weekly.InvoiceID !== null) {
            continue;
        }

        const jobsOnWeekly = asArray(await ctx.prisma.jobs.findMany({
            where: {WeeklyID: weeklyId},
            include: {
                Loads: {
                    where: activeLoadWhere,
                    select: {Weight: true, Hours: true},
                },
            },
        }));

        let totalWeight = 0;
        for (const job of jobsOnWeekly) {
            for (const load of job.Loads ?? []) {
                totalWeight += load.Weight ?? load.Hours ?? 0;
            }
        }

        await ctx.prisma.weeklies.update({
            where: {ID: weeklyId},
            data: {TotalWeight: roundMoney(totalWeight)},
        });
    }
}
