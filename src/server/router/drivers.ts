import {createRouter} from "./context";
import {z} from "zod";
import {DriversModel} from '../../../prisma/zod';

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
            order: z.string().optional()
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

            if (input.search.length > 0) {
                return ctx.prisma.drivers.findMany({
                    where: {
                        OR: [
                            {
                                FirstName: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                MiddleName: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                LastName: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                Street: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                City: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                ZIP: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                License: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                Email: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                Phone: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                HireDate: {
                                    contains: formattedSearch
                                }
                            },
                            {
                                Notes: {
                                    contains: formattedSearch
                                }
                            }
                        ]

                    },
                    include: {
                        States: true
                    },
                    take: 10,
                    orderBy: orderObj,
                })
            } else {
                return ctx.prisma.drivers.findMany({
                    include: {
                        States: true
                    },
                    take: 10,
                    skip: input.page ? input.page * 10 : 0,
                    orderBy: orderObj,
                })
            }

        }
    })
    .mutation('put', {
        // validate input with Zod
        input: DriversModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.drivers.create({
                data: input
            })
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
                }, data: data
            })
        },
    });

