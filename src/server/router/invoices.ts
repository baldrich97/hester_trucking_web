import {createRouter} from "./context";
import {z} from "zod";
import { InvoicesModel } from '../../../prisma/zod';

export const invoicesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.invoices.findMany({
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
        input: InvoicesModel.omit({ID: true, Deleted: true}).extend({selected: z.array(z.string())}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            const {selected, ...rest} = input;
            const returnable = await ctx.prisma.invoices.create({
                data: rest
            })

            for (const loadPkey of selected) {
                await ctx.prisma.loads.update({
                    where: {
                        ID: parseInt(loadPkey)
                    },
                    data: {
                        Invoiced: true,
                        InvoiceID: returnable.ID
                    }
                })
            }

            return returnable;
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: InvoicesModel.extend({selected: z.array(z.string())}),
        async resolve({ctx, input}) {
            const {ID, selected, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.invoices.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    }).mutation('postPrinted', {
        // validate input with Zod
        input: InvoicesModel.extend({selected: z.array(z.string())}),
        async resolve({ctx, input}) {
            const {ID} = input;
            // use your ORM of choice
            return ctx.prisma.invoices.update({
                where: {
                    ID: ID
                }, data: {
                    Printed: true
                }
            })
        },
    }).mutation('postPaid', {
        // validate input with Zod
        input: InvoicesModel.extend({selected: z.array(z.string())}),
        async resolve({ctx, input}) {
            const {ID, PaymentType} = input;
            // use your ORM of choice
            return ctx.prisma.invoices.update({
                where: {
                    ID: ID
                }, data: {
                    Paid: true,
                    PaymentType: PaymentType,
                    PaidDate: new Date()
                }
            })
        },
    });

