import {createRouter} from "./context";
import {z} from "zod";
import { TrucksModel } from '../../../prisma/zod';

export const trucksRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            console.log('why am i here')
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
            page: z.number().optional()
        }),
        async resolve({ctx, input}) {
            const formattedSearch = !input.search ? '' : input.search.trim().includes(' ') ? `+${input.search.trim().split(' ')[0]} +${input.search.trim().split(' ')[1]}*` : `${input.search}*`;
            if (input.search.length > 0) {
                return ctx.prisma.trucks.findMany({
                    where: {
                        Name: {
                            search: formattedSearch
                        },
                        VIN: {
                            search: formattedSearch
                        },
                        Notes: {
                            search: formattedSearch
                        },
                    },
                    take: 10,
                    orderBy: {
                        Name: 'asc'
                    }
                })
            } else {
                return ctx.prisma.trucks.findMany({
                    take: 10,
                    orderBy: {
                        Name: 'asc'
                    },
                    skip: input.page ? input.page*10 : 0
                })
            }

        }
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

