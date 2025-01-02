import {createRouter} from "./context";
import {z} from "zod";
import {CustomerLoadTypesModel, LoadsModel} from '../../../prisma/zod';
import {TRPCError} from "@trpc/server";

export const loadsRouter = createRouter()
    .query("getAll", {
        input: z.object({
            page: z.number().optional(),
            customer: z.number().optional(),
            truck: z.number().optional(),
            driver: z.number().optional(),
            loadType: z.number().optional(),
            deliveryLocation: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
            search: z.number().nullish().optional()
        }),
        async resolve({ctx, input}) {
            const { customer, driver, truck, loadType, deliveryLocation, search, order, orderBy, page } = input;
            const extra = {
                ...(customer && { CustomerID: customer }),
                ...(driver && { DriverID: driver }),
                ...(truck && { TruckID: truck }),
                ...(loadType && { LoadTypeID: loadType }),
                ...(deliveryLocation && { DeliveryLocationID: deliveryLocation }),
                ...(search && { TicketNumber: search }),
            };

            console.log('INPUT', input)

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            //const extra = input.customer !== 0 ? {AND: {CustomerID: input.customer}} : {};
            return ctx.prisma.loads.findMany({
                include: {
                    Customers: true,
                    Trucks: true,
                    Drivers: true,
                    LoadTypes: true,
                    DeliveryLocations: true
                },
                orderBy: orderObj,
                where: {
                    Deleted: null,
                    ...extra
                },
                take: 10,
                skip: input.page ? 10 * input.page : 0
            });
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
    .query('getByCustomer', {
        input: z.object({
            customer: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.loads.findMany({
                where: {
                    AND: [
                        {
                            CustomerID: input.customer,
                        },
                        {
                            OR: [
                                {
                                    Deleted: false
                                },
                                {
                                    Deleted: null
                                }
                            ]
                        },
                        {
                            OR: [
                                {
                                    Invoiced: false
                                },
                                {
                                    Invoiced: null
                                }
                            ]
                        }
                    ],
                    NOT: {
                        DriverID: 0,
                        DeliveryLocationID: 0,
                        TruckID: 0
                    }

                },
                include: {
                    LoadTypes: true,
                    DeliveryLocations: true,
                    Drivers: true,
                    Trucks: true
                }
            })

        }
    })
    .query('getCount', {
        input: z.object({
            page: z.number().optional(),
            customer: z.number().optional(),
            truck: z.number().optional(),
            driver: z.number().optional(),
            loadType: z.number().optional(),
            deliveryLocation: z.number().optional(),
            search: z.number().nullish().optional()
        }),
        async resolve({ctx, input}) {
            const { customer, driver, truck, loadType, deliveryLocation, search} = input;
            const extra = {
                ...(customer && { CustomerID: customer }),
                ...(driver && { DriverID: driver }),
                ...(truck && { TruckID: truck }),
                ...(loadType && { LoadTypeID: loadType }),
                ...(deliveryLocation && { DeliveryLocationID: deliveryLocation }),
                ...(search && { TicketNumber: search }),
            };

            return ctx.prisma.loads.count({
                where: {
                    Deleted: null,
                    ...extra
                }
            });

        }
    })
    .mutation('put_duplicate_checker', {
        input: LoadsModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            const {TicketNumber} = input;
            const existing = await ctx.prisma.loads.findFirst({where: {TicketNumber: TicketNumber}});
            if (existing) {
                return existing;
            } else {
                return false;
            }
        }
    })
    .mutation('post_duplicate_checker', {
        input: LoadsModel,
        async resolve({ctx, input}) {
            const {TicketNumber, ID} = input;
            const existing = await ctx.prisma.loads.findFirst({where: {TicketNumber: TicketNumber}});
            if (existing && existing.ID !== ID) {
                return existing;
            } else {
                return false;
            }
        }
    })
    .mutation('put', {
        input: LoadsModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            const {
                DriverID, TruckID, StartDate, CustomerID, LoadTypeID,
                DeliveryLocationID, TruckRate, MaterialRate, Week,
                TotalRate, DriverRate
            } = input;

            // 🛡️ **Validation Checks**
            const requiredFields = [
                {value: DriverID, message: "This load is missing a driver."},
                {value: LoadTypeID, message: "This load is missing a load type."},
                {value: CustomerID, message: "This load is missing a customer."},
                {value: DeliveryLocationID, message: "This load is missing a delivery location."}
            ];
            for (const field of requiredFields) {
                if (!field.value) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: field.message,
                    });
                }
            }

            if (!DriverID || !DeliveryLocationID || !LoadTypeID || !TruckID || !CustomerID) {
                return;
            }

            // 🗂️ **Fetch daily and weekly records in parallel**
            const [daily, weeklyRecord] = await Promise.all([
                ctx.prisma.dailies.findFirst({where: {DriverID, Week}}),
                ctx.prisma.weeklies.findFirst({
                    where: {CustomerID, Week, DeliveryLocationID, LoadTypeID, InvoiceID: null, Revenue: null}
                }),
            ]);

            let weekly = weeklyRecord;

            // 🛠️ **If Daily Exists**
            if (daily) {
                if (daily.LastPrinted) {
                    ctx.warnings.push('This daily has already been printed.', daily.Week, daily.DriverID.toString());
                }

                if (!weekly) {
                    weekly = await ctx.prisma.weeklies.create({
                        data: {
                            Week,
                            CustomerID,
                            LoadTypeID,
                            DeliveryLocationID,
                            CompanyRate: parseFloat((TotalRate ?? 0).toFixed(2)),
                        }
                    });
                }

                const jobs = await ctx.prisma.jobs.findMany({
                    where: {
                        DriverID,
                        CustomerID,
                        LoadTypeID,
                        DeliveryLocationID,
                        DailyID: daily.ID,
                        WeeklyID: weekly.ID,
                        PaidOut: {not: true}
                    }
                });

                const job = jobs.find(job => {
                    const compareRates = (a: number | null | undefined, b: number | null | undefined) =>
                        parseFloat((a ?? 0).toFixed(2)) === parseFloat((b ?? 0).toFixed(2));

                    return (
                        compareRates(job.TruckingRate, TruckRate) &&
                        compareRates(job.MaterialRate, MaterialRate) &&
                        compareRates(job.DriverRate, DriverRate) &&
                        compareRates(job.CompanyRate, TotalRate)
                    );
                });

                if (job) {
                    input.JobID = job.ID;
                } else {
                    const newJob = await ctx.prisma.jobs.create({
                        data: {
                            DriverID,
                            DailyID: daily.ID,
                            WeeklyID: weekly.ID,
                            CustomerID,
                            LoadTypeID,
                            DeliveryLocationID,
                            TruckingRate: parseFloat((TruckRate ?? 0).toFixed(2)),
                            CompanyRate: parseFloat((TotalRate ?? 0).toFixed(2)),
                            DriverRate: parseFloat((DriverRate ?? 0).toFixed(2)),
                            MaterialRate: parseFloat((MaterialRate ?? 0).toFixed(2)),
                        }
                    });

                    input.JobID = newJob.ID;
                }
            } else {
                // 🆕 **Create daily, weekly, and job if no daily exists**
                const [newDaily, newWeekly] = await Promise.all([
                    ctx.prisma.dailies.create({data: {DriverID, Week}}),
                    weekly
                        ? Promise.resolve(weekly)
                        : ctx.prisma.weeklies.create({
                            data: {
                                Week,
                                CustomerID,
                                LoadTypeID,
                                DeliveryLocationID,
                                CompanyRate: parseFloat((TotalRate ?? 0).toFixed(2)),
                            }
                        })
                ]);

                const newJob = await ctx.prisma.jobs.create({
                    data: {
                        DriverID,
                        DailyID: newDaily.ID,
                        WeeklyID: newWeekly?.ID ?? weekly?.ID ?? 1,
                        CustomerID,
                        LoadTypeID,
                        DeliveryLocationID,
                        TruckingRate: parseFloat((TruckRate ?? 0).toFixed(2)),
                        CompanyRate: parseFloat((TotalRate ?? 0).toFixed(2)),
                        DriverRate: parseFloat((DriverRate ?? 0).toFixed(2)),
                        MaterialRate: parseFloat((MaterialRate ?? 0).toFixed(2)),
                    }
                });

                input.JobID = newJob.ID;
            }

            // 🔗 **Relational Data Creation with Explicit Models**
            const relationalRecords: { model: keyof typeof ctx.prisma; data: Record<string, any> }[] = [
                TruckID && {model: 'trucksDriven', data: {TruckID, DriverID, DateDriven: StartDate}},
                CustomerID && LoadTypeID && {
                    model: 'customerLoadTypes',
                    data: {CustomerID, LoadTypeID, DateDelivered: StartDate}
                },
                CustomerID && DeliveryLocationID && {
                    model: 'customerDeliveryLocations',
                    data: {CustomerID, DeliveryLocationID, DateUsed: StartDate}
                }
            ].filter(Boolean) as { model: keyof typeof ctx.prisma; data: Record<string, any> }[];

            await Promise.all(
                relationalRecords.map(record =>
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    ctx.prisma[record.model].create({data: record.data})
                )
            );

            // 📦 **Create Load**
            const data = await ctx.prisma.loads.create({data: input});

            return {data, warnings: ctx.warnings};
        },
    }).mutation('post', {
        // validate input with Zod
        input: LoadsModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;

            const {
                DriverID,
                CustomerID,
                LoadTypeID,
                DeliveryLocationID,
                TruckRate,
                MaterialRate,
                Week,
                TotalRate,
                DriverRate
            } = input;

            if (!DriverID) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `This load is missing a driver.`,
                })
            }
            if (!LoadTypeID) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `This load is missing a load type.`,
                })
            }
            if (!CustomerID) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `This load is missing a customer.`,
                })
            }
            if (!DeliveryLocationID) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `This load is missing a delivery location.`,
                })
            }

            //Check if a daily already exists for this driver for this week
            const daily = await ctx.prisma.dailies.findFirst({
                where: {
                    DriverID: DriverID,
                    Week: Week
                }
            })

            if (daily) {
                let weekly = await ctx.prisma.weeklies.findFirst({
                    where: {
                        CustomerID: CustomerID,
                        Week: Week,
                        DeliveryLocationID: DeliveryLocationID,
                        LoadTypeID: LoadTypeID,
                        InvoiceID: null,
                        Revenue: null
                    }
                })

                if (!weekly) {
                    //Create a new weekly with the corresponding info
                    weekly = await ctx.prisma.weeklies.create({
                        data: {
                            Week: Week,
                            CustomerID: CustomerID,
                            LoadTypeID: LoadTypeID,
                            DeliveryLocationID: DeliveryLocationID,
                            CompanyRate: (Math.round((TotalRate ?? 0) * 100)) / 100,
                        }
                    })
                }

                //If a daily exists, grab job with that DailyID that match the criteria of this load
                let jobs = await ctx.prisma.jobs.findMany({
                    where: {
                        AND: [
                            {DriverID: DriverID},
                            {CustomerID: CustomerID},
                            {LoadTypeID: LoadTypeID},
                            {DeliveryLocationID: DeliveryLocationID},
                            {DailyID: daily.ID},
                            {WeeklyID: weekly.ID}
                        ]
                    }
                })

                jobs = jobs.filter((item) => {
                    let shouldReturn = true;
                    if (TruckRate) {
                        const loadTR = (Math.round(TruckRate * 100)) / 100
                        shouldReturn = (Math.round(item.TruckingRate * 100)) / 100 === loadTR
                    } else {
                        shouldReturn = (TruckRate ?? 0) === (item.TruckingRate ?? 0);
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (MaterialRate) {
                        const loadMR = (Math.round(MaterialRate * 100)) / 100
                        shouldReturn = (Math.round(item.MaterialRate * 100)) / 100 === loadMR
                    } else {
                        shouldReturn = (MaterialRate ?? 0) === (item.MaterialRate ?? 0);
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (DriverRate) {
                        const loadDR = (Math.round(DriverRate * 100)) / 100
                        shouldReturn = (Math.round(item.DriverRate * 100)) / 100 === loadDR
                    } else {
                        shouldReturn = (DriverRate ?? 0) === (item.DriverRate ?? 0);
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (TotalRate) {
                        const loadTR = (Math.round(TotalRate * 100)) / 100
                        shouldReturn = (Math.round(item.CompanyRate * 100)) / 100 === loadTR
                    } else {
                        shouldReturn = (TotalRate ?? 0) === (item.CompanyRate ?? 0);
                    }
                    return shouldReturn;
                })

                const job = jobs.length > 0 ? jobs[0] : null;

                //If a job exists, check if that job has been paidout, if the daily/weekly was printed, and if the weekly has been invoiced and warn accordingly
                if (job) {
                    if (job.PaidOut) {
                        //Error here that is has been paid out
                    } else if (job.CompanyRevenue || job.TruckingRevenue) {
                        //Error here that the revenues have been overridden and will need to be recalcualted
                    } else if (daily.LastPrinted || weekly.LastPrinted) {
                        //Error here that the daily/weekly has been printed already and needs to be reprinted
                    } else if (weekly.InvoiceID) {
                        //Error here that the weekly has already been invoiced and they should remake the invoice?
                    } else if (weekly.Revenue !== null) {
                        //Error here that the weekly has a revenue already
                    }

                    //Set JobID to this job
                    data.JobID = job.ID;
                } else {
                    //Else create this job and assign it to the daily/weekly
                    const newJob = await ctx.prisma.jobs.create({
                        data: {
                            DriverID: DriverID,
                            DailyID: daily.ID,
                            WeeklyID: weekly.ID,
                            CustomerID: CustomerID,
                            LoadTypeID: LoadTypeID,
                            DeliveryLocationID: DeliveryLocationID,
                            TruckingRate: (Math.round((TruckRate ?? 0) * 100)) / 100,
                            CompanyRate: (Math.round((TotalRate ?? 0) * 100)) / 100,
                            DriverRate: (Math.round((DriverRate ?? 0) * 100)) / 100,
                            MaterialRate: (Math.round((MaterialRate ?? 0) * 100)) / 100,
                        }
                    })

                    data.JobID = newJob.ID;
                }
            } else {
                //Create the daily, weekly, and the job
                const newDaily = await ctx.prisma.dailies.create({
                    data: {
                        DriverID: DriverID,
                        Week: Week
                    }
                })

                const newWeekly = await ctx.prisma.weeklies.create({
                    data: {
                        Week: Week,
                        CustomerID: CustomerID,
                        LoadTypeID: LoadTypeID,
                        DeliveryLocationID: DeliveryLocationID,
                        CompanyRate: (Math.round((TotalRate ?? 0) * 100)) / 100,
                    }
                })

                const newJob = await ctx.prisma.jobs.create({
                    data: {
                        DriverID: DriverID,
                        DailyID: newDaily.ID,
                        WeeklyID: newWeekly.ID,
                        CustomerID: CustomerID,
                        LoadTypeID: LoadTypeID,
                        DeliveryLocationID: DeliveryLocationID,
                        TruckingRate: (Math.round((TruckRate ?? 0) * 100)) / 100,
                        CompanyRate: (Math.round((TotalRate ?? 0) * 100)) / 100,
                        DriverRate: (Math.round((DriverRate ?? 0) * 100)) / 100,
                        MaterialRate: (Math.round((MaterialRate ?? 0) * 100)) / 100,
                    }
                })

                data.JobID = newJob.ID;
            }
            // use your ORM of choice
            return ctx.prisma.loads.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    })
    .mutation('delete', {
        input: LoadsModel,
        async resolve({ctx, input}) {
            const {ID} = input;
            // use your ORM of choice
            return await ctx.prisma.loads.delete({where: {ID: ID}})
        },
    });


