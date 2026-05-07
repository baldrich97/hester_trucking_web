import {createRouter} from "./context";
import {z} from "zod";
import {DriversModel} from '../../../prisma/zod';
import {wireDateToUtcNoon} from "../../utils/dateOnly";

export const driversRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.drivers.findMany({
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
            return ctx.prisma.drivers.findUnique({
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
            /** When set (e.g. Load form), marks drivers who have driven this truck — used for grouped autocomplete search. */
            TruckID: z.number().optional(),
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

            const drivers = input.search.length > 0
                ? await ctx.prisma.drivers.findMany({
                    where: {
                        OR: [
                            {
                                FirstName: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                MiddleName: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                LastName: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                Street: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                City: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                ZIP: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                License: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                Email: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                Phone: {
                                    contains: formattedSearch,
                                },
                            },
                            {
                                HireDate: {
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
                    include: {
                        States: true,
                    },
                    take: 10,
                    orderBy: orderObj,
                })
                : await ctx.prisma.drivers.findMany({
                    include: {
                        States: true,
                    },
                    take: 10,
                    skip: input.page ? input.page * 10 : 0,
                    orderBy: orderObj,
                });

            if (input.TruckID) {
                const pairs = await ctx.prisma.trucksDriven.findMany({
                    where: {TruckID: input.TruckID},
                    select: {DriverID: true},
                });
                const driven = new Set(pairs.map((p) => p.DriverID));
                return drivers.map((d) => ({
                    ...d,
                    Recommend: driven.has(d.ID),
                }));
            }

            return drivers.map((d) => ({
                ...d,
                Recommend: false,
            }));
        },
    })
    .mutation('put', {
        // validate input with Zod
        input: DriversModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.drivers.create({
                data: {...input, DOB: wireDateToUtcNoon(input.DOB)},
            });
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: DriversModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.drivers.update({
                where: {
                    ID: ID
                },
                data: {...data, DOB: wireDateToUtcNoon(data.DOB)},
            });
        },
    });

