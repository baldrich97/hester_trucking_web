import {createRouter} from "./context";
import {z} from "zod";
import {SourcesModel} from "../../../prisma/zod";

const activeLoadTypeWhere = {
    OR: [{Deleted: false}, {Deleted: null}],
};

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
        input: z.object({
            search: z.string().optional(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
            LoadTypeID: z.number().optional(),
        }),
        async resolve({ctx, input}) {
            const {search, page, LoadTypeID} = input;
            const order = input.order ?? "asc";
            const orderBy = input.orderBy ?? "Name";
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj: Record<string, string> = {};
            orderObj[orderBy] = order;

            const where = search && search.trim().length > 0
                ? {Name: {contains: search.trim()}}
                : {};

            // When a LoadTypeID is provided, surface linked sources first, sorted by UseCount desc.
            if (LoadTypeID) {
                const linked = await ctx.prisma.sourceLoadTypes.findMany({
                    where: {LoadTypeID},
                    include: {Sources: true},
                    orderBy: {UseCount: "desc"},
                });

                const linkedSources = linked
                    .map((row) => ({
                        ...row.Sources,
                        Recommend: "Linked" as const,
                        UseCount: row.UseCount,
                    }))
                    .filter((src) => {
                        if (!search || search.trim().length === 0) {
                            return true;
                        }
                        const needle = search.trim().toLowerCase();
                        return src.Name.toLowerCase().includes(needle);
                    });

                const linkedIDs = linkedSources.map((s) => s.ID);
                const remaining = await ctx.prisma.sources.findMany({
                    where: {
                        ...where,
                        NOT: {ID: {in: linkedIDs}},
                    },
                    take: 50,
                    orderBy: orderObj,
                });

                const remainingAnnotated = remaining.map((src) => ({
                    ...src,
                    Recommend: null,
                    UseCount: 0,
                }));

                return [...linkedSources, ...remainingAnnotated];
            }

            if (search && search.trim().length > 0) {
                const data = await ctx.prisma.sources.findMany({
                    where,
                    take: 50,
                    orderBy: orderObj,
                });
                return data.map((src) => ({...src, Recommend: null, UseCount: 0}));
            }

            const data = await ctx.prisma.sources.findMany({
                take: 50,
                skip: page ? page * 10 : 0,
                orderBy: orderObj,
            });
            return data.map((src) => ({...src, Recommend: null, UseCount: 0}));
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
