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
            const orderByField = input.orderBy ?? "LoadTypeID";
            const orderDir = (input.order ?? "asc") as "asc" | "desc";
            const page = input.page ?? 0;
            const [rows, count] = await Promise.all([
                ctx.prisma.customerLoadTypes.findMany({
                    where,
                    include: {
                        LoadTypes: {select: {Description: true, Notes: true}},
                    },
                    distinct: ["CustomerID", "LoadTypeID"],
                    orderBy: {[orderByField]: orderDir},
                    take: 10,
                    skip: page * 10,
                }),
                ctx.prisma.customerLoadTypes.count({where}),
            ]);
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

