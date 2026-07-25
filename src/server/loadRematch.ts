import {TRPCError} from "@trpc/server";
import {
    isNewEraLoadTypeId,
    isSourcesCutoverActive,
    NEW_LOAD_TYPE_ID_THRESHOLD,
} from "../config/sourcesCutover";

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

export async function rematchLoadToJob(ctx: any, input: RematchInput): Promise<RematchResult> {
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

    assertCutoverLoadTypeAllowed(LoadTypeID);
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

    const daily = await ctx.prisma.dailies.findFirst({where: {DriverID, Week}});

    if (daily) {
        const weeklies = await ctx.prisma.weeklies.findMany({where: weeklyWhere});

        let weekly = weeklies.find((w: {CompanyRate: number | null}) =>
            compareRates(w.CompanyRate, TotalRate),
        );

        if (!weekly) {
            weekly = await ctx.prisma.weeklies.create({
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

        const jobs = await ctx.prisma.jobs.findMany({where: jobWhere});

        const job = jobs.find((item: {
            TruckingRate: number;
            MaterialRate: number;
            DriverRate: number;
            CompanyRate: number;
            PaidOut: boolean;
        }) =>
            compareRates(item.TruckingRate, TruckRate) &&
            compareRates(item.MaterialRate, MaterialRate) &&
            compareRates(item.DriverRate, DriverRate) &&
            compareRates(item.CompanyRate, TotalRate),
        );

        if (job) {
            if (job.PaidOut) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "This job has already been paid out.",
                });
            }
            return {JobID: job.ID, SourceID: effectiveSourceId};
        }

        const newJob = await ctx.prisma.jobs.create({
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

    const newDaily = await ctx.prisma.dailies.create({data: {DriverID, Week}});

    const newWeekly = await ctx.prisma.weeklies.create({
        data: {
            Week,
            CustomerID,
            LoadTypeID,
            DeliveryLocationID,
            CompanyRate: roundRate(TotalRate),
            SourceID: effectiveSourceId,
        },
    });

    const newJob = await ctx.prisma.jobs.create({
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
