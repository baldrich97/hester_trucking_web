import {createRouter} from "./context";
import {z} from "zod";
import { CustomerLoadTypesModel } from '../../../prisma/zod';

export const customerLoadTypesRouter = createRouter()
    .query("getAll", {
        input: z.object({
            CustomerID: z.number(),
            page: z.number().optional()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.customerLoadTypes.findMany({
                where: {
                    CustomerID: input.CustomerID
                },
                include: {
                    LoadTypes: {select: {Description: true, Notes: true}}
                },
                distinct: ["CustomerID", "LoadTypeID"],
                take: 10,
                skip: input.page ? input.page*10 : 0
            });
        },
    })
    .query("getAllPage", {
        input: z.object({
            CustomerID: z.number(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            const where = {CustomerID: input.CustomerID};
            const page = input.page ?? 0;

            const [grouped, count] = await Promise.all([
                ctx.prisma.customerLoadTypes.groupBy({
                    by: ["LoadTypeID"],
                    where,
                    _max: {DateDelivered: true},
                    _count: {_all: true},
                    orderBy: {_max: {DateDelivered: "desc"}},
                    take: 10,
                    skip: page * 10,
                }),
                ctx.prisma.customerLoadTypes.groupBy({
                    by: ["LoadTypeID"],
                    where,
                }).then((groups) => groups.length),
            ]);

            const loadTypeIds = grouped.map((g) => g.LoadTypeID);
            const loadTypes =
                loadTypeIds.length > 0
                    ? await ctx.prisma.loadTypes.findMany({
                          where: {ID: {in: loadTypeIds}},
                          select: {ID: true, Description: true, Notes: true},
                      })
                    : [];
            const loadTypeMap = Object.fromEntries(loadTypes.map((lt) => [lt.ID, lt]));

            const rows = grouped.map((g) => ({
                LoadTypeID: g.LoadTypeID,
                lastUsed: g._max.DateDelivered,
                useCount: g._count._all,
                LoadTypes: loadTypeMap[g.LoadTypeID] ?? null,
            }));

            return {rows, count};
        },
    })
    .mutation('put', {
        // validate input with Zod
        input: CustomerLoadTypesModel.omit({ID: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.customerLoadTypes.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: CustomerLoadTypesModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.customerLoadTypes.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    })
    .mutation('delete', {
        input: CustomerLoadTypesModel.omit({DateDelivered: true}),
        async resolve({ctx, input}) {
            const {CustomerID, LoadTypeID} = input;
            // use your ORM of choice
            return await ctx.prisma.customerLoadTypes.deleteMany({where: {
                AND: [
                    {CustomerID: CustomerID},
                    {LoadTypeID: LoadTypeID}
                ]
            }})
        },
    });
