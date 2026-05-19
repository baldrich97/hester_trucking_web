import {createRouter} from "./context";
import {z} from "zod";
import {SourcesModel} from "../../../prisma/zod";
import {Sources, Prisma} from "@prisma/client";
import {
    SEARCH_SCAN_LIMIT,
    OTHER_GROUP,
    assembleDropdownResults,
} from "./_dropdownSearch";

/**
 * `Source` dropdown groups:
 *   - `LoadType`: sources linked to the selected load type
 *   - `Other`: everything else (capped at `OTHER_GROUP_LIMIT`)
 */
const SOURCE_GROUPS = {
    LOAD_TYPE: "LoadType",
    OTHER: OTHER_GROUP,
} as const;

const activeLoadTypeWhere = {
    OR: [{Deleted: false}, {Deleted: null}],
};

function sourceSearchClause(trimmed: string): Prisma.SourcesWhereInput | undefined {
    if (trimmed.length === 0) return undefined;
    return {Name: {contains: trimmed}};
}

export const sourcesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.sources.findMany({
                orderBy: {Name: "asc"},
            });
        },
    })
    .query("get", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            const source = await ctx.prisma.sources.findUnique({
                where: {ID: input.ID},
                include: {
                    SourceLoadTypes: {
                        where: {LoadTypes: activeLoadTypeWhere},
                        include: {
                            LoadTypes: {
                                select: {ID: true, Description: true, Notes: true},
                            },
                        },
                        orderBy: {LoadTypes: {Description: "asc"}},
                    },
                },
            });

            if (!source) {
                return null;
            }

            const {SourceLoadTypes, ...rest} = source;
            return {
                ...rest,
                LoadTypes: SourceLoadTypes
                    .map((row) => row.LoadTypes)
                    .filter((row): row is {ID: number; Description: string; Notes: string | null} => row != null),
            };
        },
    })
    .query("search", {
        // Dropdown contract — see `_dropdownSearch.ts`. `LoadTypeID` only decides
        // grouping; it does NOT widen the result set.
        input: z.object({
            search: z.string().optional(),
            LoadTypeID: z.number().optional(),
        }),
        async resolve({ctx, input}) {
            const trimmed = (input.search ?? "").trim();
            const searchClause = sourceSearchClause(trimmed);
            const baseWhere: Prisma.SourcesWhereInput = searchClause ?? {};

            // Linked sources + their UseCount (for annotation).
            const linkedUseCount = new Map<number, number>();
            if (input.LoadTypeID) {
                const rows = await ctx.prisma.sourceLoadTypes.findMany({
                    where: {LoadTypeID: input.LoadTypeID},
                    select: {SourceID: true, UseCount: true},
                });
                for (const r of rows) {
                    // `@@unique([SourceID, LoadTypeID])` guards duplicates, but
                    // keep a "first wins" guard so we can never re-introduce them.
                    if (linkedUseCount.has(r.SourceID)) continue;
                    linkedUseCount.set(r.SourceID, r.UseCount);
                }
            }

            const searchHits = await ctx.prisma.sources.findMany({
                where: baseWhere,
                take: SEARCH_SCAN_LIMIT,
                orderBy: {Name: "asc"},
            });

            // Recover linked-AND-matching rows that fell outside the search window.
            const seenInHits = new Set(searchHits.map((r) => r.ID));
            const linkedIDsOutsideHits = Array.from(linkedUseCount.keys()).filter(
                (id) => !seenInHits.has(id),
            );
            let recommendedExtras: Sources[] = [];
            if (linkedIDsOutsideHits.length > 0) {
                recommendedExtras = await ctx.prisma.sources.findMany({
                    where: {
                        AND: [
                            {ID: {in: linkedIDsOutsideHits}},
                            ...(searchClause ? [searchClause] : []),
                        ],
                    },
                });
            }

            const allRows = [...searchHits, ...recommendedExtras];
            const decorate = (row: Sources) => ({
                ...row,
                UseCount: linkedUseCount.get(row.ID) ?? 0,
            });
            const byUseCountThenName = (a: Sources, b: Sources) => {
                const ua = linkedUseCount.get(a.ID) ?? 0;
                const ub = linkedUseCount.get(b.ID) ?? 0;
                if (ua !== ub) return ub - ua;
                return a.Name.localeCompare(b.Name);
            };

            return assembleDropdownResults([
                {
                    group: SOURCE_GROUPS.LOAD_TYPE,
                    rows: allRows
                        .filter((r) => linkedUseCount.has(r.ID))
                        .sort(byUseCountThenName),
                    decorate,
                },
                {
                    group: SOURCE_GROUPS.OTHER,
                    rows: searchHits.filter((r) => !linkedUseCount.has(r.ID)),
                    decorate,
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
            const order = input.order ?? "asc";
            const orderBy = input.orderBy ?? "Name";
            const page = input.page ?? 0;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj: Record<string, string> = {};
            orderObj[orderBy] = order;

            const where = input.search && input.search.trim().length > 0
                ? {
                    Name: {
                        contains: input.search.trim(),
                    },
                }
                : {};

            const [rows, count] = await Promise.all([
                ctx.prisma.sources.findMany({
                    where,
                    take: 10,
                    skip: page * 10,
                    orderBy: orderObj,
                }),
                ctx.prisma.sources.count({where}),
            ]);

            return {rows, count};
        },
    })
    .query("searchAvailableLoadTypes", {
        input: z.object({
            SourceID: z.number(),
            search: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            const search = input.search?.trim();
            return ctx.prisma.loadTypes.findMany({
                where: {
                    ...activeLoadTypeWhere,
                    NOT: {
                        SourceLoadTypes: {
                            some: {SourceID: input.SourceID},
                        },
                    },
                    ...(search
                        ? {
                            Description: {
                                contains: search,
                            },
                        }
                        : {}),
                },
                orderBy: {Description: "asc"},
                take: 100,
                select: {
                    ID: true,
                    Description: true,
                    Notes: true,
                },
            });
        },
    })
    .mutation("put", {
        input: SourcesModel.omit({ID: true}),
        async resolve({ctx, input}) {
            return ctx.prisma.sources.create({
                data: input,
            });
        },
    })
    .mutation("post", {
        input: SourcesModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            return ctx.prisma.sources.update({
                where: {ID},
                data,
            });
        },
    })
    .mutation("delete", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            // SourceLoadTypes rows cascade-delete when the Source is removed
            // (see schema.prisma onDelete: Cascade). No manual cleanup required.
            return ctx.prisma.sources.delete({
                where: {ID: input.ID},
            });
        },
    })
    .mutation("assignLoadTypes", {
        input: z.object({
            SourceID: z.number(),
            LoadTypeIDs: z.array(z.number()).min(1),
        }),
        async resolve({ctx, input}) {
            const result = await ctx.prisma.sourceLoadTypes.createMany({
                data: input.LoadTypeIDs.map((LoadTypeID) => ({
                    SourceID: input.SourceID,
                    LoadTypeID,
                })),
                skipDuplicates: true,
            });

            return {
                updatedCount: result.count,
            };
        },
    })
    .mutation("removeLoadType", {
        input: z.object({
            SourceID: z.number(),
            LoadTypeID: z.number(),
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.sourceLoadTypes.deleteMany({
                where: {
                    SourceID: input.SourceID,
                    LoadTypeID: input.LoadTypeID,
                },
            });
        },
    });
