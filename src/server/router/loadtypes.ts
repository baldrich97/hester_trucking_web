import {createRouter} from "./context";
import {z} from "zod";
import {LoadTypesModel} from "../../../prisma/zod";
import {LoadTypes, Sources} from "@prisma/client";
import {
    SEARCH_SCAN_LIMIT,
    OTHER_GROUP,
    assembleDropdownResults,
    notDeleted,
} from "./_dropdownSearch";

/**
 * `LoadType` dropdown groups (server -> client field `Group`):
 *   - `CustomerAndSource`: linked to both the selected customer and source
 *   - `Customer`: linked to the selected customer only
 *   - `Source`: linked to the selected source only
 *   - `Other`: not linked to either (capped at `OTHER_GROUP_LIMIT`)
 */
const LOADTYPE_GROUPS = {
    CUSTOMER_AND_SOURCE: "CustomerAndSource",
    CUSTOMER: "Customer",
    SOURCE: "Source",
    OTHER: OTHER_GROUP,
} as const;

/** Picks the best-fit source for annotating a load type's DisplayName. */
function pickAnnotationSource(
    links: Array<{Sources: Sources; SourceID: number; UseCount: number}>,
    preferredSourceID: number | undefined,
): {source: Sources; useCount: number} | null {
    if (preferredSourceID) {
        const match = links.find((l) => l.SourceID === preferredSourceID);
        if (match) return {source: match.Sources, useCount: match.UseCount};
    }
    if (links.length === 0) return null;
    const sorted = [...links].sort((a, b) => {
        if (b.UseCount !== a.UseCount) return b.UseCount - a.UseCount;
        return a.SourceID - b.SourceID;
    });
    const top = sorted[0];
    return top ? {source: top.Sources, useCount: top.UseCount} : null;
}

export const loadTypesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return await ctx.prisma.loadTypes.findMany({
                where: {
                    OR: [
                        {
                            Deleted: false
                        },
                        {
                            Deleted: null
                        }
                    ],
                }
            });
        },
    })
    .query('get', {
        input: z.object({
            ID: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.loadTypes.findUnique({
                where: {
                    ID: input.ID
                }
            })

        }
    })
    .query("search", {
        // Dropdown contract — see `_dropdownSearch.ts`. The `search` text is the
        // only filter on the row set; `CustomerID` / `SourceID` only determine
        // which mutually-exclusive group each matching row lands in.
        input: z.object({
            search: z.string().optional(),
            CustomerID: z.number().optional(),
            SourceID: z.number().optional(),
        }),
        async resolve({ctx, input}) {
            const trimmed = (input.search ?? "").trim();
            const searchClause = trimmed.length > 0
                ? {
                    OR: [
                        {Description: {contains: trimmed}},
                        {Notes: {contains: trimmed}},
                    ],
                }
                : undefined;
            const baseWhere = searchClause
                ? {AND: [notDeleted, searchClause]}
                : notDeleted;

            // Fetch the fkey-linked ID sets up front; they're small and indexed.
            const customerLinkedIDs = new Set<number>();
            if (input.CustomerID) {
                const rows = await ctx.prisma.customerLoadTypes.findMany({
                    where: {CustomerID: input.CustomerID},
                    select: {LoadTypeID: true},
                });
                rows.forEach((r) => customerLinkedIDs.add(r.LoadTypeID));
            }
            const sourceLinkedIDs = new Set<number>();
            if (input.SourceID) {
                const rows = await ctx.prisma.sourceLoadTypes.findMany({
                    where: {SourceID: input.SourceID},
                    select: {LoadTypeID: true},
                });
                rows.forEach((r) => sourceLinkedIDs.add(r.LoadTypeID));
            }

            // Search hits — newest first; capped so a broad search can't pull
            // thousands of rows.
            const searchHits = await ctx.prisma.loadTypes.findMany({
                where: baseWhere,
                take: SEARCH_SCAN_LIMIT,
                orderBy: {ID: "desc"},
            });

            // Make sure every recommended row (customer-linked OR source-linked)
            // that matches the search is included, even if it fell outside the
            // SEARCH_SCAN_LIMIT window above.
            const seenInHits = new Set(searchHits.map((r) => r.ID));
            const recommendedIDsOutsideHits = [
                ...Array.from(customerLinkedIDs),
                ...Array.from(sourceLinkedIDs),
            ].filter((id) => !seenInHits.has(id));
            let recommendedExtras: LoadTypes[] = [];
            if (recommendedIDsOutsideHits.length > 0) {
                recommendedExtras = await ctx.prisma.loadTypes.findMany({
                    where: {
                        AND: [
                            notDeleted,
                            {ID: {in: recommendedIDsOutsideHits}},
                            searchClause ?? {},
                        ],
                    },
                });
            }

            const allRows: LoadTypes[] = [...searchHits, ...recommendedExtras];

            // Annotate every row with `DisplayName` (e.g. `Hourly (Rock)`) and
            // `UseCount` from its best-fit source link.
            const allIDs = allRows.map((r) => r.ID);
            const sourceLinks = allIDs.length > 0
                ? await ctx.prisma.sourceLoadTypes.findMany({
                    where: {LoadTypeID: {in: allIDs}},
                    include: {Sources: true},
                })
                : [];
            const linksByLoadType = new Map<number, typeof sourceLinks>();
            for (const link of sourceLinks) {
                const list = linksByLoadType.get(link.LoadTypeID) ?? [];
                list.push(link);
                linksByLoadType.set(link.LoadTypeID, list);
            }

            const decorate = (row: LoadTypes) => {
                const links = linksByLoadType.get(row.ID) ?? [];
                const annotation = pickAnnotationSource(links, input.SourceID);
                const shortName = annotation
                    ? (annotation.source.ShortName && annotation.source.ShortName.length > 0
                        ? annotation.source.ShortName
                        : annotation.source.Name)
                    : null;
                return {
                    ...row,
                    DisplayName: shortName ? `${row.Description} (${shortName})` : row.Description,
                    UseCount: annotation?.useCount ?? 0,
                };
            };

            // Split into mutually-exclusive buckets. Sort within each bucket by
            // Description so the order is stable / scannable.
            const linkedToCustomer = (id: number) => customerLinkedIDs.has(id);
            const linkedToSource = (id: number) => sourceLinkedIDs.has(id);
            const byDescription = (a: LoadTypes, b: LoadTypes) =>
                a.Description.localeCompare(b.Description);

            return assembleDropdownResults(
                [
                    {
                        group: LOADTYPE_GROUPS.CUSTOMER_AND_SOURCE,
                        rows: allRows
                            .filter((r) => linkedToCustomer(r.ID) && linkedToSource(r.ID))
                            .sort(byDescription),
                        decorate,
                    },
                    {
                        group: LOADTYPE_GROUPS.CUSTOMER,
                        rows: allRows
                            .filter((r) => linkedToCustomer(r.ID) && !linkedToSource(r.ID))
                            .sort(byDescription),
                        decorate,
                    },
                    {
                        group: LOADTYPE_GROUPS.SOURCE,
                        rows: allRows
                            .filter((r) => !linkedToCustomer(r.ID) && linkedToSource(r.ID))
                            .sort(byDescription),
                        decorate,
                    },
                    {
                        group: LOADTYPE_GROUPS.OTHER,
                        rows: searchHits
                            .filter((r) => !linkedToCustomer(r.ID) && !linkedToSource(r.ID)),
                        decorate,
                    },
                ],
            );
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
            const {page} = input;
            const orderByField = input.orderBy ?? 'ID';
            const orderDir = input.order ?? 'desc';
            const orderObj = {[orderByField]: orderDir};

            const where = {
                OR: [{Deleted: false}, {Deleted: null}],
                ...(input.search && input.search.length > 0
                    ? {
                          AND: {
                              OR: [
                                  {Notes: {contains: input.search.replace('"', '\\"')}},
                                  {Description: {contains: input.search.replace('"', '\\"')}},
                              ],
                          },
                      }
                    : {}),
            };

            const [rows, count] = await Promise.all([
                ctx.prisma.loadTypes.findMany({
                    where,
                    take: 10,
                    skip: page ? page * 10 : 0,
                    orderBy: orderObj,
                }),
                ctx.prisma.loadTypes.count({where}),
            ]);

            return {rows, count};
        },
    })
    .mutation('put', {
        // validate input with Zod
        input: LoadTypesModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.loadTypes.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: LoadTypesModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.loadTypes.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

