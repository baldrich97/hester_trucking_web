import {createRouter} from "./context";
import {z} from "zod";
import { LoadsModel } from '../../../prisma/zod';

export const loadsRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.loads.findMany();
        },
    })
    .query('get', {
        input: z.object({
            ID: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.loads.findUnique({
                where: {
                    ID: input.ID
                }
            })

        }
    })
    // .query('search', {
    //     input: z.object({
    //         search: z.string()
    //     }),
    //     async resolve({ctx, input}) {
    //         const formattedSearch = `${input.search}*`;
    //         return ctx.prisma.loads.findMany({
    //             where: {
    //                 Name: {
    //                     search: formattedSearch
    //                 },
    //                 Street: {
    //                     search: formattedSearch
    //                 },
    //                 City: {
    //                     search: formattedSearch
    //                 },
    //                 ZIP: {
    //                     search: formattedSearch
    //                 },
    //                 Email: {
    //                     search: formattedSearch
    //                 },
    //                 Phone: {
    //                     search: formattedSearch
    //                 },
    //                 MainContact: {
    //                     search: formattedSearch
    //                 },
    //                 Notes: {
    //                     search: formattedSearch
    //                 },
    //             },
    //             include: {
    //                 States: true
    //             }
    //         })
    //
    //     }
    // })
    .mutation('put', {
        // validate input with Zod
        input: LoadsModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.loads.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: LoadsModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.loads.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

