import {createRouter} from "./context";
import {z} from "zod";
import { DriversModel } from '../../../prisma/zod';

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
            search: z.string()
        }),
        async resolve({ctx, input}) {
            const formattedSearch = `${input.search}*`;
            return ctx.prisma.drivers.findMany({
                where: {
                    FirstName: {
                        search: formattedSearch
                    },
                    MiddleName: {
                        search: formattedSearch
                    },
                    LastName: {
                        search: formattedSearch
                    },
                    Street: {
                        search: formattedSearch
                    },
                    City: {
                        search: formattedSearch
                    },
                    ZIP: {
                        search: formattedSearch
                    },
                    License: {
                        search: formattedSearch
                    },
                    Email: {
                        search: formattedSearch
                    },
                    Phone: {
                        search: formattedSearch
                    },
                    HireDate: {
                        search: formattedSearch
                    },
                    Notes: {
                        search: formattedSearch
                    },
                },
                include: {
                    States: true
                }
            })

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

