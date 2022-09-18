import {createRouter} from "./context";
import {z} from "zod";
import { TrucksModel } from '../../../prisma/zod';

export const trucksRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.trucks.findMany();
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
            search: z.string()
        }),
        async resolve({ctx, input}) {
            const formattedSearch = `${input.search}*`;
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
                }
            })

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

