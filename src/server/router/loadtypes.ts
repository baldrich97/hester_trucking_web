import {createRouter} from "./context";
import {z} from "zod";
import { LoadTypesModel } from '../../../prisma/zod';

export const loadTypesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.loadTypes.findMany({
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
            search: z.string()
        }),
        async resolve({ctx, input}) {
            const formattedSearch = `${input.search}*`;
            return ctx.prisma.loadTypes.findMany({
                where: {
                    Notes: {
                        search: formattedSearch
                    },
                    Description: {
                        search: formattedSearch
                    },
                }
            })

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

