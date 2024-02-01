import {createRouter} from "./context";
import {z} from "zod";
import { LoadTypesModel } from '../../../prisma/zod';
import { LoadTypes, Prisma } from "@prisma/client";

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
    .query('search', {
        input: z.object({
            search: z.string().optional(),
            page: z.number().optional(),
            CustomerID: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const extra: LoadTypes[] = [];
            if (input.CustomerID) {
                const associated = await ctx.prisma.customerLoadTypes.findMany({where: {CustomerID: input.CustomerID}, include: {LoadTypes: true}})
                associated.forEach((item) => {
                    if (extra.filter((_item) => _item.ID === item.LoadTypeID).length === 0) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        item.LoadTypes.Recommend = true;
                        extra.push(item.LoadTypes)
                    }
                })
            }
            const extraCondition = extra.length > 0 ? {
                NOT: {
                    ID: {
                        in: extra.map((item) => item.ID)
                    }
                }
            } : {}
            let data = [];

            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            let orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            if (input.search && input.search.length > 0) {
                const formattedSearch = input.search.replace('"', '\"');

                data = await ctx.prisma.loadTypes.findMany({
                    where: {
                        OR: [
                            {
                                Notes: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                Description: {
                                    contains: formattedSearch
                                }
                            }
                        ],
                        ...extraCondition
                    },
                    take: 50,
                    orderBy: orderObj,
                })
            } else {
                data = await ctx.prisma.loadTypes.findMany({
                    take: 50,
                    orderBy: orderObj,
                    where: {
                        ...extraCondition
                    },
                    skip: input.page ? input.page*10 : 0
                })
            }

            return [...extra, ...data];

        }
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

