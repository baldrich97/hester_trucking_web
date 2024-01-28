import {createRouter} from "./context";
import {z} from "zod";
import {InvoicesModel, LoadsModel} from '../../../prisma/zod';

export const invoicesRouter = createRouter()
    .query("getAll", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.search && input.search.toString().length > 0 && input.search.toString().includes('.')) {
                extra.push({TotalAmount: input.search})
            }
            if (input.search && input.search.toString().length > 0 && !input.search.toString().includes('.')) {
                extra.push({Number: input.search})
            }
            
            if (input.customer !== 0) {
                extra.push({CustomerID: input.customer})
            }
            return ctx.prisma.invoices.findMany({
                where: {
                    OR: [
                        {Paid: true}, {Paid: false}, {Paid: null}
                    ],
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                    AND: {
                        OR: [
                            ...extra
                        ],
                    }
                },
                take: 10,
                include: {
                    Customers: true,
                    Loads: true
                },
                orderBy: {
                    InvoiceDate: 'desc'
                },
                skip: input.page ? input.page * 10 : 0
            });
        },
    })
    .query("getAllPaid", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.search && input.search.toString().length > 0 && input.search.toString().includes('.')) {
                extra.push({TotalAmount: input.search})
            }
            if (input.search && input.search.toString().length > 0 && !input.search.toString().includes('.')) {
                extra.push({Number: input.search})
            }
            
            if (input.customer !== 0) {
                extra.push({CustomerID: input.customer})
            }
            return ctx.prisma.invoices.findMany({
                where: {
                    OR: [
                        {Paid: true}
                    ],
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                    AND : {
                        OR: [
                            ...extra
                        ]
                    }
                },
                include: {
                    Customers: true,
                    Loads: true
                },
                take: 10,
                orderBy: {
                    InvoiceDate: 'desc'
                },
                skip: input.page ? 10*input.page : 0
            });
        },
    })
    .query("getAllUnpaid", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.search && input.search.toString().length > 0 && input.search.toString().includes('.')) {
                extra.push({TotalAmount: input.search})
            }
            if (input.search && input.search.toString().length > 0 && !input.search.toString().includes('.')) {
                extra.push({Number: input.search})
            }
            
            if (input.customer !== 0) {
                extra.push({CustomerID: input.customer})
            }
            return ctx.prisma.invoices.findMany({
                where: {
                    OR: [
                        {Paid: false}, {Paid: null}
                    ],
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                    AND : {
                        OR: [
                            ...extra
                        ]
                    }
                },
                include: {
                    Customers: true,
                    Loads: true
                },
                take: 10,
                orderBy: {
                    InvoiceDate: 'desc'
                },
                skip: input.page ? 10*input.page : 0
            });
        },
    })
    .query("getCount", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            tabValue: z.number().optional()
        }),
        async resolve({ctx, input}) {
            const extra = [];
            const paidValue = [];
            if (input.search && input.search.toString().length > 0 && input.search.toString().includes('.')) {
                extra.push({TotalAmount: input.search})
            }
            if (input.search && input.search.toString().length > 0 && !input.search.toString().includes('.')) {
                extra.push({Number: input.search})
            }
            
            if (input.customer !== 0) {
                extra.push({CustomerID: input.customer})
            }
            if (input.tabValue === 0) {
                paidValue.push({Paid: false})
            }
            if (input.tabValue === 1) {
                paidValue.push({Paid: true})
            }
            return ctx.prisma.invoices.count({
                where: {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                    OR: [
                        ...extra
                    ],
                    AND: {
                        OR: [
                            ...paidValue
                        ]
                    }
                },
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
    })
    .mutation('delete', {
        input: InvoicesModel,
        async resolve({ctx, input}) {
            const {ID} = input;
            //make related loads available again
            await ctx.prisma.loads.findMany({where: {InvoiceID: ID}}).then(async (loads) => {
                loads.forEach(async (load) => {
                    ctx.prisma.loads.update({where: {ID: load.ID}, data: {Invoiced: false, InvoiceID: null}}).then();
                })
            });

            // use your ORM of choice
            return await ctx.prisma.invoices.delete({where: {ID: ID}})
        },
    });

