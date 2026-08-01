import {TRPCError} from "@trpc/server";
import {
    isNewEraLoadTypeId,
    isSourcesCutoverActive,
    NEW_LOAD_TYPE_ID_THRESHOLD,
} from "../config/sourcesCutover";

import {
    CLOSED_JOB_REMATCH_WARNING,
} from "../constants/loadWarnings";

export {CLOSED_JOB_REMATCH_WARNING};

export function assertCutoverLoadTypeAllowed(loadTypeId: number | null | undefined): void {
    if (!isSourcesCutoverActive()) {
        if (loadTypeId != null && loadTypeId >= NEW_LOAD_TYPE_ID_THRESHOLD) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "New catalog load types are not available until the Sources cutover.",
            });
        }
    }
}

/** Source persisted on load/job/weekly only for new-era load types after cutover. */
export function resolveSourceIdForRematch(
    loadTypeId: number | null | undefined,
    sourceId: number | null | undefined,
): number | null {
    if (!isSourcesCutoverActive() || !isNewEraLoadTypeId(loadTypeId)) {
        return null;
    }
    return sourceId ?? null;
}

export function compareRates(a: number | null | undefined, b: number | null | undefined): boolean {
    return parseFloat((a ?? 0).toFixed(2)) === parseFloat((b ?? 0).toFixed(2));
}

export function roundRate(value: number | null | undefined): number {
    return parseFloat((value ?? 0).toFixed(2));
}

export type RematchInput = {
    DriverID: number;
    CustomerID: number;
    LoadTypeID: number;
    DeliveryLocationID: number;
    Week: string;
    TruckRate?: number | null;
    MaterialRate?: number | null;
    DriverRate?: number | null;
    TotalRate?: number | null;
    SourceID?: number | null;
};

export type RematchResult = {
    JobID: number;
    SourceID: number | null;
};

type JobCandidate = {
    ID: number;
    TruckingRate: number;
    MaterialRate: number;
    DriverRate: number;
    CompanyRate: number;
    PaidOut: boolean;
    TruckingRevenue: number | null;
    CompanyRevenue: number | null;
};

function ratesMatchJob(
    item: JobCandidate,
    TruckRate: number | null | undefined,
    MaterialRate: number | null | undefined,
    DriverRate: number | null | undefined,
    TotalRate: number | null | undefined,
): boolean {
    return (
        compareRates(item.TruckingRate, TruckRate) &&
        compareRates(item.MaterialRate, MaterialRate) &&
        compareRates(item.DriverRate, DriverRate) &&
        compareRates(item.CompanyRate, TotalRate)
    );
}

function isJobClosed(job: JobCandidate): boolean {
    return job.TruckingRevenue !== null || job.CompanyRevenue !== null;
}

function pushClosedJobWarning(ctx: any, week: string, customerId: number): void {
    if (Array.isArray(ctx.warnings) && !ctx.warnings.includes(CLOSED_JOB_REMATCH_WARNING)) {
        ctx.warnings.push(CLOSED_JOB_REMATCH_WARNING, week, customerId.toString());
    }
}

async function rematchWithClient(ctx: any, input: RematchInput): Promise<RematchResult> {
    const prisma = ctx.prisma;
    const {
        DriverID,
        CustomerID,
        LoadTypeID,
        DeliveryLocationID,
        Week,
        TruckRate,
        MaterialRate,
        DriverRate,
        TotalRate,
        SourceID,
    } = input;

    const effectiveSourceId = resolveSourceIdForRematch(LoadTypeID, SourceID);

    const weeklyWhere: Record<string, unknown> = {
        CustomerID,
        Week,
        DeliveryLocationID,
        LoadTypeID,
        InvoiceID: null,
        Revenue: null,
    };
    if (isNewEraLoadTypeId(LoadTypeID) && isSourcesCutoverActive()) {
        weeklyWhere.SourceID = effectiveSourceId;
    }

    const daily = await prisma.dailies.findFirst({where: {DriverID, Week}});

    if (daily) {
        const weeklies = await prisma.weeklies.findMany({where: weeklyWhere});

        let weekly = weeklies.find((w: {CompanyRate: number | null}) =>
            compareRates(w.CompanyRate, TotalRate),
        );

        if (!weekly) {
            weekly = await prisma.weeklies.create({
                data: {
                    Week,
                    CustomerID,
                    LoadTypeID,
                    DeliveryLocationID,
                    CompanyRate: roundRate(TotalRate),
                    SourceID: effectiveSourceId,
                },
            });
        }

        const jobWhere: Record<string, unknown> = {
            DriverID,
            CustomerID,
            LoadTypeID,
            DeliveryLocationID,
            DailyID: daily.ID,
            WeeklyID: weekly.ID,
            PaidOut: {not: true},
        };
        if (isNewEraLoadTypeId(LoadTypeID) && isSourcesCutoverActive()) {
            jobWhere.SourceID = effectiveSourceId;
        }

        const jobs: JobCandidate[] = await prisma.jobs.findMany({where: jobWhere});

        const openJob = jobs.find(
            (item) => ratesMatchJob(item, TruckRate, MaterialRate, DriverRate, TotalRate) && !isJobClosed(item),
        );

        if (openJob) {
            if (openJob.PaidOut) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "This job has already been paid out.",
                });
            }
            return {JobID: openJob.ID, SourceID: effectiveSourceId};
        }

        const closedMatch = jobs.find(
            (item) => ratesMatchJob(item, TruckRate, MaterialRate, DriverRate, TotalRate) && isJobClosed(item),
        );
        if (closedMatch) {
            pushClosedJobWarning(ctx, Week, CustomerID);
        }

        const newJob = await prisma.jobs.create({
            data: {
                DriverID,
                DailyID: daily.ID,
                WeeklyID: weekly.ID,
                CustomerID,
                LoadTypeID,
                DeliveryLocationID,
                TruckingRate: roundRate(TruckRate),
                CompanyRate: roundRate(TotalRate),
                DriverRate: roundRate(DriverRate),
                MaterialRate: roundRate(MaterialRate),
                SourceID: effectiveSourceId,
            },
        });

        return {JobID: newJob.ID, SourceID: effectiveSourceId};
    }

    const newDaily = await prisma.dailies.create({data: {DriverID, Week}});

    const newWeekly = await prisma.weeklies.create({
        data: {
            Week,
            CustomerID,
            LoadTypeID,
            DeliveryLocationID,
            CompanyRate: roundRate(TotalRate),
            SourceID: effectiveSourceId,
        },
    });

    const newJob = await prisma.jobs.create({
        data: {
            DriverID,
            DailyID: newDaily.ID,
            WeeklyID: newWeekly.ID,
            CustomerID,
            LoadTypeID,
            DeliveryLocationID,
            TruckingRate: roundRate(TruckRate),
            CompanyRate: roundRate(TotalRate),
            DriverRate: roundRate(DriverRate),
            MaterialRate: roundRate(MaterialRate),
            SourceID: effectiveSourceId,
        },
    });

    return {JobID: newJob.ID, SourceID: effectiveSourceId};
}

export async function rematchLoadToJob(ctx: any, input: RematchInput): Promise<RematchResult> {
    assertCutoverLoadTypeAllowed(input.LoadTypeID);
    return ctx.prisma.$transaction(async (tx: typeof ctx.prisma) =>
        rematchWithClient({...ctx, prisma: tx}, input),
    );
}
