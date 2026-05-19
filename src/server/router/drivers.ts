import {createRouter} from "./context";
import {z} from "zod";
import {DriversModel} from "../../../prisma/zod";
import {wireDateToUtcNoon} from "../../utils/dateOnly";
import {Drivers, Prisma} from "@prisma/client";
import {
    SEARCH_SCAN_LIMIT,
    OTHER_GROUP,
    assembleDropdownResults,
    notDeleted,
} from "./_dropdownSearch";

/**
 * `Driver` dropdown groups:
 *   - `Truck`: drivers who have driven the selected truck
 *   - `Other`: everyone else (capped at `OTHER_GROUP_LIMIT`)
 */
const DRIVER_GROUPS = {
    TRUCK: "Truck",
    OTHER: OTHER_GROUP,
} as const;

/** Columns scanned by the typed search text in `drivers.search` / `drivers.searchPage`. */
function driverSearchClause(trimmed: string): Prisma.DriversWhereInput | undefined {
    if (trimmed.length === 0) return undefined;
    return {
        OR: [
            {FirstName: {contains: trimmed}},
            {MiddleName: {contains: trimmed}},
            {LastName: {contains: trimmed}},
            {Street: {contains: trimmed}},
            {City: {contains: trimmed}},
            {ZIP: {contains: trimmed}},
            {License: {contains: trimmed}},
            {Email: {contains: trimmed}},
            {Phone: {contains: trimmed}},
            {HireDate: {contains: trimmed}},
            {Notes: {contains: trimmed}},
        ],
    };
}

export const driversRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.drivers.findMany({where: notDeleted});
        },
    })
    .query("get", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            return ctx.prisma.drivers.findUnique({where: {ID: input.ID}});
        },
    })
    .query("search", {
        // Dropdown contract — see `_dropdownSearch.ts`. The typed `search` text
        // is the only filter; `TruckID` and `onlyActive` only steer grouping
        // and active filtering.
        input: z.object({
            search: z.string().optional(),
            TruckID: z.number().optional(),
            /** When true (Load form), exclude inactive drivers. */
            onlyActive: z.boolean().optional(),
        }),
        async resolve({ctx, input}) {
            const trimmed = (input.search ?? "").trim();
            const searchClause = driverSearchClause(trimmed);
            const baseFilters: Prisma.DriversWhereInput[] = [notDeleted];
            if (searchClause) baseFilters.push(searchClause);
            if (input.onlyActive === true) baseFilters.push({Active: true});
            const baseWhere: Prisma.DriversWhereInput = {AND: baseFilters};

            // Drivers who have driven the selected truck (ID set).
            const truckLinkedIDs = new Set<number>();
            if (input.TruckID) {
                const rows = await ctx.prisma.trucksDriven.findMany({
                    where: {TruckID: input.TruckID},
                    select: {DriverID: true},
                });
                rows.forEach((r) => truckLinkedIDs.add(r.DriverID));
            }

            const searchHits = await ctx.prisma.drivers.findMany({
                where: baseWhere,
                take: SEARCH_SCAN_LIMIT,
                orderBy: {ID: "desc"},
                include: {States: true},
            });

            // Recover linked-AND-matching rows that fell outside the search window.
            const seenInHits = new Set(searchHits.map((r) => r.ID));
            const linkedIDsOutsideHits = Array.from(truckLinkedIDs).filter(
                (id) => !seenInHits.has(id),
            );
            let recommendedExtras: typeof searchHits = [];
            if (linkedIDsOutsideHits.length > 0) {
                const where: Prisma.DriversWhereInput = {
                    AND: [
                        ...baseFilters.filter((f) => f !== searchClause || !searchClause),
                        {ID: {in: linkedIDsOutsideHits}},
                        ...(searchClause ? [searchClause] : []),
                    ],
                };
                recommendedExtras = await ctx.prisma.drivers.findMany({
                    where,
                    include: {States: true},
                });
            }

            const allRows = [...searchHits, ...recommendedExtras];
            const byName = (a: Drivers, b: Drivers) =>
                a.LastName.localeCompare(b.LastName) || a.FirstName.localeCompare(b.FirstName);

            return assembleDropdownResults([
                {
                    group: DRIVER_GROUPS.TRUCK,
                    rows: allRows.filter((r) => truckLinkedIDs.has(r.ID)).sort(byName),
                },
                {
                    group: DRIVER_GROUPS.OTHER,
                    rows: searchHits.filter((r) => !truckLinkedIDs.has(r.ID)),
                },
            ]);
        },
    })
    .query("searchPage", {
        // Paginated endpoint used by the Drivers index table.
        input: z.object({
            search: z.string().optional(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            const trimmed = (input.search ?? "").trim();
            const searchClause = driverSearchClause(trimmed);
            const baseFilters: Prisma.DriversWhereInput[] = [notDeleted];
            if (searchClause) baseFilters.push(searchClause);
            const where: Prisma.DriversWhereInput = {AND: baseFilters};

            const orderByField = input.orderBy ?? "ID";
            const orderDir = (input.order ?? "desc") as "asc" | "desc";
            const orderObj = {[orderByField]: orderDir};

            const page = input.page ?? 0;
            const [rows, count] = await Promise.all([
                ctx.prisma.drivers.findMany({
                    where,
                    include: {States: true},
                    orderBy: orderObj,
                    take: 10,
                    skip: page * 10,
                }),
                ctx.prisma.drivers.count({where}),
            ]);
            return {rows, count};
        },
    })
    .mutation("put", {
        input: DriversModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            return ctx.prisma.drivers.create({
                data: {
                    ...input,
                    DOB: wireDateToUtcNoon(input.DOB),
                    LicenseExpiration: wireDateToUtcNoon(input.LicenseExpiration),
                } as any,
            });
        },
    })
    .mutation("post", {
        input: DriversModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            return ctx.prisma.drivers.update({
                where: {ID: ID},
                data: {
                    ...data,
                    DOB: wireDateToUtcNoon(data.DOB),
                    LicenseExpiration: wireDateToUtcNoon(data.LicenseExpiration),
                } as any,
            });
        },
    });
