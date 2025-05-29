import {createRouter} from "./context";
import {z} from "zod";
import {InvoicesModel, LoadsModel} from '../../../prisma/zod';
import {prisma} from "../db/client";
import {TRPCError} from "@trpc/server";


export const invoicesRouter = createRouter()
    .query("getAll", {
        input: z.object({
            customer: z.number().optional(),
            loadType: z.number().optional(),
            deliveryLocation: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const {search, customer, order, loadType, deliveryLocation, orderBy} = input;

            const extra = {
                ...(search && search?.toString().length > 0 && {
                    OR: [
                        {TotalAmount: search},
                        ...(!search.toString().includes('.') ? [{Number: search}] : [])
                    ]
                }),
                ...(customer !== 0 && {CustomerID: customer}),
                ...(deliveryLocation && {
                    Loads: {
                        some: {
                            DeliveryLocationID: deliveryLocation
                        }
                    }
                }),
                ...(loadType && {
                    Loads: {
                        some: {
                            LoadTypeID: loadType
                        }
                    }
                }),
            };

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;


            return ctx.prisma.invoices.findMany({
                where: {
                    ...extra
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
            loadType: z.number().optional(),
            deliveryLocation: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const {search, customer, order, loadType, deliveryLocation, orderBy} = input;

            const extra = {
                ...(search && search?.toString().length > 0 && {
                    OR: [
                        {TotalAmount: search},
                        ...(!search.toString().includes('.') ? [{Number: search}] : [])
                    ]
                }),
                ...(customer !== 0 && {CustomerID: customer}),
                ...(deliveryLocation && {
                    Loads: {
                        some: {
                            DeliveryLocationID: deliveryLocation
                        }
                    }
                }),
                ...(loadType && {
                    Loads: {
                        some: {
                            LoadTypeID: loadType
                        }
                    }
                }),
            };

            console.log('HERE', extra)

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            return ctx.prisma.invoices.findMany({
                where: {
                    Paid: true,
                    Consolidated: false,
                    ...extra
                },
                include: {
                    Customers: true,
                    Loads: true
                },
                take: 10,
                orderBy: orderObj,
                skip: input.page ? 10 * input.page : 0
            });
        },
    })
    .query("getAllUnpaid", {
        input: z.object({
            customer: z.number().optional(),
            loadType: z.number().optional(),
            deliveryLocation: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
            showAll: z.boolean().optional()
        }),
        async resolve({ctx, input}) {
            const {search, customer, order, loadType, deliveryLocation, orderBy} = input;

            const extra = {
                ...(search && search?.toString().length > 0 && {
                    OR: [
                        {TotalAmount: search},
                        ...(!search.toString().includes('.') ? [{Number: search}] : [])
                    ]
                }),
                ...(customer !== 0 && {CustomerID: customer}),
                ...(deliveryLocation && {
                    Loads: {
                        some: {
                            DeliveryLocationID: deliveryLocation
                        }
                    }
                }),
                ...(loadType && {
                    Loads: {
                        some: {
                            LoadTypeID: loadType
                        }
                    }
                }),
            };

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            return ctx.prisma.invoices.findMany({
                where: {
                    Paid: {not: true},
                    Consolidated: false,
                    ...extra

                },
                include: {
                    Customers: true,
                    Loads: true
                },
                take: 10,
                orderBy: orderObj,
                skip: input.page ? 10 * input.page : 0
            });
        },
    })

    .query("getAllConsolidated", {
        input: z.object({
            customer: z.number().optional(),
            loadType: z.number().optional(),
            deliveryLocation: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
            showAll: z.boolean().optional()
        }),
        async resolve({ctx, input}) {
            const {search, customer, order, loadType, deliveryLocation, orderBy} = input;

            const extra = {
                ...(search && search?.toString().length > 0 && {
                    TotalAmount: search,
                    ...(!search.toString().includes('.') && {Number: search})
                }),
                ...(customer !== 0 && {CustomerID: customer}),
                ...(deliveryLocation && {
                    Loads: {
                        some: {
                            DeliveryLocationID: deliveryLocation
                        }
                    }
                }),
                ...(loadType && {
                    Loads: {
                        some: {
                            LoadTypeID: loadType
                        }
                    }
                }),
            };

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;


            return ctx.prisma.invoices.findMany({
                where: {
                    Paid: {not: true},
                    Consolidated: true,
                    ...extra
                },
                include: {
                    Customers: true,
                    Loads: true
                },
                take: 10,
                orderBy: orderObj,
                skip: input.page ? 10 * input.page : 0
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
                    AND: [{
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
                skip: input.page ? 10 * input.page : 0
            });
        },
    })
    .query("getCount", {
        input: z.object({
            customer: z.number().optional(),
            loadType: z.number().optional(),
            deliveryLocation: z.number().optional(),
            page: z.number().optional(),
            search: z.number().nullish().optional(),
            tabValue: z.number().optional()
        }),
        async resolve({ctx, input}) {
            const {search, customer, tabValue, loadType, deliveryLocation} = input;

            const extra = {
                ...(search && search?.toString().length > 0 && {
                    TotalAmount: search,
                    ...(!search.toString().includes('.') && {Number: search})
                }),
                ...(customer !== 0 && {CustomerID: customer}),
                ...(tabValue === 0 && {Paid: {not: true}}),
                ...(tabValue === 1 && {Paid: true}),
                ...(deliveryLocation && {
                    Loads: {
                        some: {
                            DeliveryLocationID: deliveryLocation
                        }
                    }
                }),
                ...(loadType && {
                    Loads: {
                        some: {
                            LoadTypeID: loadType
                        }
                    }
                }),
            };

            return ctx.prisma.invoices.count({
                where: {
                    ...extra
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
        input: InvoicesModel.omit({ID: true, Deleted: true}).extend({selected: z.array(z.string())}),
        async resolve({ctx, input}) {
            const {selected, ...rest} = input;

            // 🚨 Validate duplicate invoice number
            const dupeInvoice = await ctx.prisma.invoices.findFirst({
                where: {Number: input.Number}
            });

            if (dupeInvoice) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `There is already an invoice numbered ${input.Number}. Please change the invoice number.`,
                });
            }

            // 🚀 Create Invoice
            const returnable = await ctx.prisma.invoices.create({
                data: rest,
            });

            // 📝 Batch Update Weeklies
            await ctx.prisma.weeklies.updateMany({
                where: {
                    ID: {in: selected.map((id) => parseInt(id))},
                },
                data: {InvoiceID: returnable.ID},
            });

            // 📝 Fetch All Relevant Jobs and Loads in Batch
            const jobs = await ctx.prisma.jobs.findMany({
                where: {
                    WeeklyID: {in: selected.map((id) => parseInt(id))},
                },
                select: {
                    ID: true,
                },
            });

            if (jobs.length === 0) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Missing jobs for selected weeklies.`,
                });
            }

            const jobIDs = jobs.map((job) => job.ID);

            const loads = await ctx.prisma.loads.findMany({
                where: {
                    JobID: {in: jobIDs},
                },
                select: {
                    ID: true,
                },
            });

            // 📝 Batch Update Loads
            if (loads.length > 0) {
                await ctx.prisma.loads.updateMany({
                    where: {
                        ID: {in: loads.map((load) => load.ID)},
                    },
                    data: {
                        Invoiced: true,
                        InvoiceID: returnable.ID,
                    },
                });
            }

            return true;
        },
    }).mutation('putConsolidated', {
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
                await Promise.all(consolidatedChildren.map(async (consInv) => {
                    await ctx.prisma.invoices.update({
                        where: {
                            ID: consInv.ID
                        }, data: {
                            ConsolidatedID: null
                        }
                    })
                }))
            }
            //make related loads available again
            await ctx.prisma.loads.findMany({where: {InvoiceID: ID}}).then(async (loads) => {
                await Promise.all(loads.map(async (load) => {
                    ctx.prisma.loads.update({where: {ID: load.ID}, data: {Invoiced: false, InvoiceID: null}}).then();
                }))
            });

            //make related weeklies available again
            await ctx.prisma.weeklies.findMany({where: {InvoiceID: ID}}).then(async (weeklies) => {
                await Promise.all(weeklies.map(async (weekly) => {
                    ctx.prisma.weeklies.update({where: {ID: weekly.ID}, data: {InvoiceID: null}}).then();
                }))
            });

            // use your ORM of choice
            return await ctx.prisma.invoices.delete({where: {ID: ID}})
        },
    });

