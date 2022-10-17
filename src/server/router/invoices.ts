import {createRouter} from "./context";
import {z} from "zod";
import { InvoicesModel } from '../../../prisma/zod';

export const invoicesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.invoices.findMany();
        },
    })
    .query('get', {
        input: z.object({
            ID: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.invoices.findUnique({
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
    //         return ctx.prisma.invoices.findMany({
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
        input: InvoicesModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.invoices.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: InvoicesModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.invoices.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

