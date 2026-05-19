import {createRouter} from "./context";
import {z} from "zod";
import {DeliveryLocationsModel} from "../../../prisma/zod";
import {DeliveryLocations, Prisma} from "@prisma/client";
import {
    SEARCH_SCAN_LIMIT,
    OTHER_GROUP,
    assembleDropdownResults,
    notDeleted,
} from "./_dropdownSearch";

/**
 * `DeliveryLocation` dropdown groups:
 *   - `Customer`: delivery locations linked to the selected customer
 *   - `Other`: everything else (capped at `OTHER_GROUP_LIMIT`)
 */
const DELIVERY_LOCATION_GROUPS = {
    CUSTOMER: "Customer",
    OTHER: OTHER_GROUP,
} as const;

function deliveryLocationSearchClause(
    trimmed: string,
): Prisma.DeliveryLocationsWhereInput | undefined {
    if (trimmed.length === 0) return undefined;
    return {Description: {contains: trimmed}};
}

export const deliveryLocationsRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.deliveryLocations.findMany({where: notDeleted});
        },
    })
    .query("get", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            return ctx.prisma.deliveryLocations.findUnique({where: {ID: input.ID}});
        },
    })
    .query("search", {
        // Dropdown contract — see `_dropdownSearch.ts`.
        input: z.object({
            search: z.string().optional(),
            CustomerID: z.number().optional(),
        }),
        async resolve({ctx, input}) {
            const trimmed = (input.search ?? "").trim();
            const searchClause = deliveryLocationSearchClause(trimmed);
            const baseFilters: Prisma.DeliveryLocationsWhereInput[] = [notDeleted];
            if (searchClause) baseFilters.push(searchClause);
            const baseWhere: Prisma.DeliveryLocationsWhereInput = {AND: baseFilters};

            const customerLinkedIDs = new Set<number>();
            if (input.CustomerID) {
                const rows = await ctx.prisma.customerDeliveryLocations.findMany({
                    where: {CustomerID: input.CustomerID},
                    select: {DeliveryLocationID: true},
                });
                rows.forEach((r) => customerLinkedIDs.add(r.DeliveryLocationID));
            }

            const searchHits = await ctx.prisma.deliveryLocations.findMany({
                where: baseWhere,
                take: SEARCH_SCAN_LIMIT,
                orderBy: {ID: "desc"},
            });

            const seenInHits = new Set(searchHits.map((r) => r.ID));
            const linkedIDsOutsideHits = Array.from(customerLinkedIDs).filter(
                (id) => !seenInHits.has(id),
            );
            let recommendedExtras: DeliveryLocations[] = [];
            if (linkedIDsOutsideHits.length > 0) {
                recommendedExtras = await ctx.prisma.deliveryLocations.findMany({
                    where: {
                        AND: [
                            notDeleted,
                            {ID: {in: linkedIDsOutsideHits}},
                            ...(searchClause ? [searchClause] : []),
                        ],
                    },
                });
            }

            const allRows = [...searchHits, ...recommendedExtras];
            const byDescription = (a: DeliveryLocations, b: DeliveryLocations) =>
                a.Description.localeCompare(b.Description);

            return assembleDropdownResults([
                {
                    group: DELIVERY_LOCATION_GROUPS.CUSTOMER,
                    rows: allRows
                        .filter((r) => customerLinkedIDs.has(r.ID))
                        .sort(byDescription),
                },
                {
                    group: DELIVERY_LOCATION_GROUPS.OTHER,
                    rows: searchHits.filter((r) => !customerLinkedIDs.has(r.ID)),
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
            const searchClause = deliveryLocationSearchClause(trimmed);
            const baseFilters: Prisma.DeliveryLocationsWhereInput[] = [notDeleted];
            if (searchClause) baseFilters.push(searchClause);
            const where: Prisma.DeliveryLocationsWhereInput = {AND: baseFilters};

            const orderByField = input.orderBy ?? "ID";
            const orderDir = (input.order ?? "desc") as "asc" | "desc";
            const orderObj = {[orderByField]: orderDir};

            const page = input.page ?? 0;
            const [rows, count] = await Promise.all([
                ctx.prisma.deliveryLocations.findMany({
                    where,
                    orderBy: orderObj,
                    take: 10,
                    skip: page * 10,
                }),
                ctx.prisma.deliveryLocations.count({where}),
            ]);
            return {rows, count};
        },
    })
    .mutation("put", {
        input: DeliveryLocationsModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            return ctx.prisma.deliveryLocations.create({data: input});
        },
    })
    .mutation("post", {
        input: DeliveryLocationsModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            return ctx.prisma.deliveryLocations.update({where: {ID: ID}, data: data});
        },
    });
