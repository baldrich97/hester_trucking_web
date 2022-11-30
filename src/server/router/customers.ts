import {createRouter} from "./context";
import {z} from "zod";
import { CustomersModel } from '../../../prisma/zod';

export const customersRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.customers.findMany({
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
            return ctx.prisma.customers.findUnique({
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
            return ctx.prisma.customers.findMany({
                where: {
                    Name: {
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
                    Email: {
                        search: formattedSearch
                    },
                    Phone: {
                        search: formattedSearch
                    },
                    MainContact: {
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
        input: CustomersModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.customers.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: CustomersModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.customers.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

