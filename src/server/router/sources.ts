import {createRouter} from "./context";
import {z} from "zod";
import {SourcesModel} from "../../../prisma/zod";

const activeLoadTypeWhere = {
    OR: [{Deleted: false}, {Deleted: null}],
};

export const sourcesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            const prismaAny = ctx.prisma as any;
            return prismaAny.sources.findMany({
                orderBy: {Name: "asc"},
            });
        },
    })
    .query("get", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            const prismaAny = ctx.prisma as any;
            return prismaAny.sources.findUnique({
                where: {ID: input.ID},
                include: {
                    LoadTypes: {
                        where: activeLoadTypeWhere,
                        orderBy: {Description: "asc"},
                        select: {ID: true, Description: true, Notes: true, SourceID: true},
                    },
                },
            });
        },
    })
    .query("search", {
        input: z.object({
            search: z.string().optional(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            const {search, page} = input;
            const order = input.order ?? "asc";
            const orderBy = input.orderBy ?? "Name";
            const prismaAny = ctx.prisma as any;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            if (search && search.trim().length > 0) {
                return prismaAny.sources.findMany({
                    where: {
                        Name: {
                            contains: search.trim(),
                        },
                    },
                    take: 50,
                    orderBy: orderObj,
                });
            }

            return prismaAny.sources.findMany({
                take: 50,
                skip: page ? page * 10 : 0,
                orderBy: orderObj,
            });
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
            const prismaAny = ctx.prisma as any;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            const where = input.search && input.search.trim().length > 0
                ? {
                    Name: {
                        contains: input.search.trim(),
                    },
                }
                : {};

            const [rows, count] = await Promise.all([
                prismaAny.sources.findMany({
                    where,
                    take: 10,
                    skip: page * 10,
                    orderBy: orderObj,
                }),
                prismaAny.sources.count({where}),
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
                    OR: [
                        {SourceID: null},
                        {SourceID: {not: input.SourceID}},
                    ],
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
                    SourceID: true,
                },
            });
        },
    })
    .mutation("put", {
        input: SourcesModel.omit({ID: true}),
        async resolve({ctx, input}) {
            const prismaAny = ctx.prisma as any;
            return prismaAny.sources.create({
                data: input,
            });
        },
    })
    .mutation("post", {
        input: SourcesModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            const prismaAny = ctx.prisma as any;
            return prismaAny.sources.update({
                where: {ID},
                data,
            });
        },
    })
    .mutation("delete", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            const prismaAny = ctx.prisma as any;
            await ctx.prisma.loadTypes.updateMany({
                where: {SourceID: input.ID},
                data: {SourceID: null},
            });
            return prismaAny.sources.delete({
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
            const updateResult = await ctx.prisma.loadTypes.updateMany({
                where: {
                    ID: {in: input.LoadTypeIDs},
                },
                data: {SourceID: input.SourceID},
            });

            return {
                updatedCount: updateResult.count,
            };
        },
    })
    .mutation("removeLoadType", {
        input: z.object({
            SourceID: z.number(),
            LoadTypeID: z.number(),
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.loadTypes.updateMany({
                where: {
                    ID: input.LoadTypeID,
                    SourceID: input.SourceID,
                },
                data: {SourceID: null},
            });
        },
    });
