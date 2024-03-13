import {createRouter} from "./context";
import {z} from "zod";
import {InvoicesModel, LoadsModel} from '../../../prisma/zod';
import {prisma} from "../db/client";
import {TRPCError} from "@trpc/server";

export const invoicesRouter = createRouter()
    .query("getAll", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.search && input.search.toString().length > 0) {
                extra.push({TotalAmount: input.search})
                if (!input.search.toString().includes('.')) {
                    extra.push({Number: input.search})
                }
            }
            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            orderObj[orderBy] = order;
            
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
                orderBy: orderObj,
                skip: input.page ? input.page * 10 : 0
            });
        },
    })
    .query("getAllPaid", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.search && input.search.toString().length > 0) {
                extra.push({TotalAmount: input.search})
                if (!input.search.toString().includes('.')) {
                    extra.push({Number: input.search})
                }
            }            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            orderObj[orderBy] = order;
            
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
                orderBy: orderObj,
                skip: input.page ? 10*input.page : 0
            });
        },
    })
    .query("getAllUnpaid", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
            showAll: z.boolean().optional()
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.search && input.search.toString().length > 0) {
                extra.push({TotalAmount: input.search})
                if (!input.search.toString().includes('.')) {
                    extra.push({Number: input.search})
                }
            }

            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            orderObj[orderBy] = order;
            
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
                    AND : [{
                        OR: [
                            {Consolidated: false},
                            ...extra
                        ],
        
                    }]
                },
                include: {
                    Customers: true,
                    Loads: true
                },
                take: 10,
                orderBy: orderObj,
                skip: input.page ? 10*input.page : 0
            });
        },
    })

    .query("getAllConsolidated", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
            showAll: z.boolean().optional()
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.search && input.search.toString().length > 0) {
                extra.push({TotalAmount: input.search})
                if (!input.search.toString().includes('.')) {
                    extra.push({Number: input.search})
                }
            }

            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            orderObj[orderBy] = order;
            
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
                    AND : [{
                        OR: [
                            ...extra
                        ],
        
                    },
                {Consolidated: true}]
                },
                include: {
                    Customers: true,
                    Loads: true
                },
                take: 10,
                orderBy: orderObj,
                skip: input.page ? 10*input.page : 0
            });
        },
    })
    .query("getAllConsolidateable", {
        input: z.object({
            customer: z.number().optional(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
            showAll: z.boolean().optional()
        }),
        async resolve({ctx, input}) {
            const extra = [];

            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
            orderObj[orderBy] = order;
            
            if (input.customer !== 0) {
                extra.push({CustomerID: input.customer})
            }

            if (input.showAll) {// eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                andArray.push()
            }

            return ctx.prisma.invoices.findMany({
                where: {
                    OR: [
                        {Paid: false}, {Paid: null}
                    ],
                    AND : [{
                        OR: [
                            ...extra
                        ],
                        
                    },
                    {Consolidated: false},
                    {ConsolidatedID: null}
                    ]
                },
                include: {
                    Customers: true,
                    Loads: true
                },
                take: 100,
                orderBy: orderObj,
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
            if (input.search && input.search.toString().length > 0) {
                extra.push({TotalAmount: input.search})
                if (!input.search.toString().includes('.')) {
                    extra.push({Number: input.search})
                }
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
            const invoicedLoads = await ctx.prisma.loads.findMany({
                where: {
                    AND: [
                        {ID: { in: selected.map((pkey) => parseInt(pkey))}},
                        {Invoiced: true}
                    ]
                },
                include: {Invoices: true}
            })

            if (invoicedLoads.length > 0) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Load(s) with ticket number ${invoicedLoads.map((item) => item.TicketNumber ?? 'N/A').join(', ')} have already been invoiced in invoice number(s) ${invoicedLoads.map((item) => item.Invoices?.Number ?? 'N/A').join(', ')}.`,
                })
            }

            const dupeInvoice = await ctx.prisma.invoices.findMany({where: {Number: input.Number}})

            if (dupeInvoice.length > 0) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `There is already an invoice numbered ${input.Number}. Please change the invoice number.`,
                })
            }

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
    .mutation('putConsolidated', {
        // validate input with Zod
        input: z.object({ids: z.array(z.number())}),
        async resolve({ctx, input}) {
            const lastInvoice = await ctx.prisma.invoices.aggregate({
                _max: {
                    Number: true,
                },
            });

            let newTotal = 0;
            let customerID = null;

            if (input.ids.length > 0) {
                for (const invoiceID of input.ids) {
                    const item = await ctx.prisma.invoices.findUnique({
                        where: {
                            ID: invoiceID
                        }
                    })
                    if (item) {
                        console.log('TOTAL', item.TotalAmount)
                        newTotal += (Math.round((item.TotalAmount + Number.EPSILON) * 100) / 100)
                        customerID = item.CustomerID
                    }

                }
            } else {
                return false;
            }

            if (!customerID) {
                return false;
            }


            // use your ORM of choice
            const returnable = await ctx.prisma.invoices.create({
                data: {
                    InvoiceDate: new Date(),
                    Number: (lastInvoice?._max.Number ?? 0) + 1,
                    CustomerID: customerID,
                    TotalAmount: (Math.round((newTotal + Number.EPSILON) * 100) / 100),
                    Consolidated: true
                }
            })

            const consolidatedID = returnable.ID;



            if (input.ids.length > 0) {
                for (const invoiceID of input.ids) {
                    await ctx.prisma.invoices.update({
                        where: {
                            ID: invoiceID
                        },
                        data: {
                            ConsolidatedID: consolidatedID
                        }
                    })
                }
            }

            return true;
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
            const date = new Date();
            date.setHours(5)
            if (input.Consolidated) {
                const consolidatedChildren = await ctx.prisma.invoices.findMany({where: {ConsolidatedID: ID}})
                consolidatedChildren.forEach(async (consInv) => {
                    await ctx.prisma.invoices.update({
                        where: {
                            ID: consInv.ID
                        }, data: {
                            Paid: true,
                            PaymentType: PaymentType,
                            PaidDate: date
                        }
                    })
                })
            }
            // use your ORM of choice
            return ctx.prisma.invoices.update({
                where: {
                    ID: ID
                }, data: {
                    Paid: true,
                    PaymentType: PaymentType,
                    PaidDate: date
                }
            })
        },
    })
    .mutation('delete', {
        input: InvoicesModel,
        async resolve({ctx, input}) {
            const {ID} = input;
            //make related consolidated invoices unlinked if needed
            if (input.Consolidated) {
                const consolidatedChildren = await ctx.prisma.invoices.findMany({where: {ConsolidatedID: ID}})
                consolidatedChildren.forEach(async (consInv) => {
                    await ctx.prisma.invoices.update({
                        where: {
                            ID: consInv.ID
                        }, data: {
                            ConsolidatedID: null
                        }
                    })
                })
            }
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

