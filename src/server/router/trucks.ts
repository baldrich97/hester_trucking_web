import {createRouter} from "./context";
import {z} from "zod";
import {TrucksModel} from '../../../prisma/zod';

export const trucksRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.trucks.findMany({
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
            return ctx.prisma.trucks.findUnique({
                where: {
                    ID: input.ID
                }
            })

        }
    })
    .query('search', {
        input: z.object({
            search: z.string(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
            /** When set (e.g. Load form), marks trucks this driver has driven — used for grouped autocomplete search. */
            DriverID: z.number().optional(),
        }),
        async resolve({ctx, input}) {
            const formattedSearch = input.search.replace('"', '\"');

            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            const trucks = input.search.length > 0
                ? await ctx.prisma.trucks.findMany({
                    where: {
                        OR: [
                            {
                                Name: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                VIN: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                Notes: {
                                    contains: formattedSearch,
                                },
                            },
                        ],
                    },
                    take: 10,
                    orderBy: orderObj,
                })
                : await ctx.prisma.trucks.findMany({
                    take: 10,
                    orderBy: orderObj,
                    skip: input.page ? input.page * 10 : 0,
                });

            if (input.DriverID) {
                const pairs = await ctx.prisma.trucksDriven.findMany({
                    where: {DriverID: input.DriverID},
                    select: {TruckID: true},
                });
                const driven = new Set(pairs.map((p) => p.TruckID));
                return trucks.map((t) => ({
                    ...t,
                    Recommend: driven.has(t.ID),
                }));
            }

            return trucks.map((t) => ({
                ...t,
                Recommend: false,
            }));
        },
    })
    .mutation('put', {
        // validate input with Zod
        input: TrucksModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.trucks.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: TrucksModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.trucks.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

