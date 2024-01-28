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
                },
                take: 10
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
            search: z.string(),
            page: z.number().optional()
        }),
        async resolve({ctx, input}) {
            const formattedSearch = input.search.trim().includes(' ') ? `+${input.search.trim().split(' ')[0]} +${input.search.trim().split(' ')[1]}*` : `${input.search}*`;
            if (input.search.length > 0) {
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
                    orderBy: {
                        Name: 'asc'
                    },
                    include: {
                        States: true
                    },
                    take: 10,
                })
            } else {
                return ctx.prisma.customers.findMany({
                    orderBy: {
                        Name: 'asc'
                    },
                    include: {
                        States: true
                    },
                    take: 10,
                    skip: input.page ? 10*input.page : 0
                })
            }

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

