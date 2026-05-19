import {createRouter} from "./context";
import {z} from "zod";
import {TrucksModel} from "../../../prisma/zod";
import {Trucks, Prisma} from "@prisma/client";
import {
    SEARCH_SCAN_LIMIT,
    OTHER_GROUP,
    assembleDropdownResults,
    notDeleted,
} from "./_dropdownSearch";

/**
 * `Truck` dropdown groups:
 *   - `Driver`: trucks the selected driver has driven
 *   - `Other`: everything else (capped at `OTHER_GROUP_LIMIT`)
 */
const TRUCK_GROUPS = {
    DRIVER: "Driver",
    OTHER: OTHER_GROUP,
} as const;

function truckSearchClause(trimmed: string): Prisma.TrucksWhereInput | undefined {
    if (trimmed.length === 0) return undefined;
    return {
        OR: [
            {Name: {contains: trimmed}},
            {VIN: {contains: trimmed}},
            {Notes: {contains: trimmed}},
        ],
    };
}

export const trucksRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.trucks.findMany({where: notDeleted});
        },
    })
    .query("get", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            return ctx.prisma.trucks.findUnique({where: {ID: input.ID}});
        },
    })
    .query("search", {
        // Dropdown contract — see `_dropdownSearch.ts`.
        input: z.object({
            search: z.string().optional(),
            DriverID: z.number().optional(),
            /** When true (Load form), exclude inactive trucks. */
            onlyActive: z.boolean().optional(),
        }),
        async resolve({ctx, input}) {
            const trimmed = (input.search ?? "").trim();
            const searchClause = truckSearchClause(trimmed);
            const baseFilters: Prisma.TrucksWhereInput[] = [notDeleted];
            if (searchClause) baseFilters.push(searchClause);
            if (input.onlyActive === true) baseFilters.push({Active: true});
            const baseWhere: Prisma.TrucksWhereInput = {AND: baseFilters};

            const driverLinkedIDs = new Set<number>();
            if (input.DriverID) {
                const rows = await ctx.prisma.trucksDriven.findMany({
                    where: {DriverID: input.DriverID},
                    select: {TruckID: true},
                });
                rows.forEach((r) => driverLinkedIDs.add(r.TruckID));
            }

            const searchHits = await ctx.prisma.trucks.findMany({
                where: baseWhere,
                take: SEARCH_SCAN_LIMIT,
                orderBy: {ID: "desc"},
            });

            const seenInHits = new Set(searchHits.map((r) => r.ID));
            const linkedIDsOutsideHits = Array.from(driverLinkedIDs).filter(
                (id) => !seenInHits.has(id),
            );
            let recommendedExtras: Trucks[] = [];
            if (linkedIDsOutsideHits.length > 0) {
                recommendedExtras = await ctx.prisma.trucks.findMany({
                    where: {
                        AND: [
                            notDeleted,
                            {ID: {in: linkedIDsOutsideHits}},
                            ...(searchClause ? [searchClause] : []),
                            ...(input.onlyActive === true ? [{Active: true}] : []),
                        ],
                    },
                });
            }

            const allRows = [...searchHits, ...recommendedExtras];
            const byName = (a: Trucks, b: Trucks) => a.Name.localeCompare(b.Name);

            return assembleDropdownResults([
                {
                    group: TRUCK_GROUPS.DRIVER,
                    rows: allRows.filter((r) => driverLinkedIDs.has(r.ID)).sort(byName),
                },
                {
                    group: TRUCK_GROUPS.OTHER,
                    rows: searchHits.filter((r) => !driverLinkedIDs.has(r.ID)),
                },
            ]);
        },
    })
    .query("searchPage", {
        input: z.object({
            search: z.string().optional(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            const trimmed = (input.search ?? "").trim();
            const searchClause = truckSearchClause(trimmed);
            const baseFilters: Prisma.TrucksWhereInput[] = [notDeleted];
            if (searchClause) baseFilters.push(searchClause);
            const where: Prisma.TrucksWhereInput = {AND: baseFilters};

            const orderByField = input.orderBy ?? "ID";
            const orderDir = (input.order ?? "desc") as "asc" | "desc";
            const orderObj = {[orderByField]: orderDir};

            const page = input.page ?? 0;
            const [rows, count] = await Promise.all([
                ctx.prisma.trucks.findMany({
                    where,
                    orderBy: orderObj,
                    take: 10,
                    skip: page * 10,
                }),
                ctx.prisma.trucks.count({where}),
            ]);
            return {rows, count};
        },
    })
    .mutation("put", {
        input: TrucksModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            return ctx.prisma.trucks.create({data: input});
        },
    })
    .mutation("post", {
        input: TrucksModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            return ctx.prisma.trucks.update({where: {ID: ID}, data: data});
        },
    });
