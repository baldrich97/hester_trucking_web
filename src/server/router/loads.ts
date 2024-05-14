import {createRouter} from "./context";
import {z} from "zod";
import {CustomerLoadTypesModel, LoadsModel} from '../../../prisma/zod';
import { TRPCError } from "@trpc/server";

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
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.customer !== 0) {
                extra.push({CustomerID: input.customer})
            }
            if (input.driver !== 0) {
                extra.push({DriverID: input.driver})
            }
            if (input.truck !== 0) {
                extra.push({TruckID: input.truck})
            }
            if (input.loadType !== 0) {
                extra.push({LoadTypeID: input.loadType})
            }
            if (input.deliveryLocation !== 0) {
                extra.push({DeliveryLocationID: input.deliveryLocation})
            }

            const {order, orderBy} = input;

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
                    OR: [
                        {
                            Deleted: false
                        },
                        {
                            Deleted: null
                        },
                    ],
                    AND: {
                        OR: [
                            ...extra
                        ],
                    }
                },
                take: 10,
                skip: input.page ? 10*input.page : 0
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
            deliveryLocation: z.number().optional()
        }),
        async resolve({ctx, input}) {
            const extra = [];
            if (input.customer !== 0) {
                extra.push({CustomerID: input.customer})
            }
            if (input.driver !== 0) {
                extra.push({DriverID: input.driver})
            }
            if (input.truck !== 0) {
                extra.push({TruckID: input.truck})
            }
            if (input.loadType !== 0) {
                extra.push({LoadTypeID: input.loadType})
            }
            if (input.deliveryLocation !== 0) {
                extra.push({DeliveryLocationID: input.deliveryLocation})
            }
            return ctx.prisma.loads.count({
                where: {
                    OR: [
                        ...extra
                    ],
                    AND: {
                        OR: [
                            {
                                Deleted: false
                            },
                            {
                                Deleted: null
                            },
                        ]
                    }
                }
            });

        }
    })
    .mutation('put', {
        // validate input with Zod
        input: LoadsModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            const {DriverID, TruckID, StartDate, CustomerID, LoadTypeID, DeliveryLocationID, TruckRate, MaterialRate, Week, TotalRate, DriverRate} = input;

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

            let weekly = await ctx.prisma.weeklies.findFirst({
                where: {
                    CustomerID: CustomerID,
                    Week: Week,
                    DeliveryLocationID: DeliveryLocationID,
                    LoadTypeID: LoadTypeID,
                    //Revenue: null
                    //should do this eventually but for now we'll see how it goes
                }
            })


            if (daily) {
                //if (!weekly || ((Math.round((weekly.CompanyRate ?? 0) * 100)) / 100) !== ((Math.round((TotalRate ?? 0) * 100)) / 100)) {
                //should implement this at some point but for now is fine?
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
                        shouldReturn = item.TruckingRate === loadTR
                    } else {
                        shouldReturn = TruckRate === item.TruckingRate ?? 0;
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (MaterialRate) {
                        const loadMR = (Math.round(MaterialRate * 100)) / 100
                        shouldReturn = item.MaterialRate === loadMR
                    } else {
                        shouldReturn = MaterialRate === item.MaterialRate ?? 0;
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (DriverRate) {
                        const loadDR = (Math.round(DriverRate * 100)) / 100
                        shouldReturn = item.DriverRate === loadDR
                    } else {
                        shouldReturn = DriverRate === item.DriverRate ?? 0;
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (TotalRate) {
                        const loadTR = (Math.round(TotalRate * 100)) / 100
                        shouldReturn = item.CompanyRate === loadTR
                    } else {
                        shouldReturn = TotalRate === item.CompanyRate ?? 0;
                    }
                    return shouldReturn;
                })

                const job = jobs.length > 0 ? jobs[0] : null;

                //If a job exists, check if that job has been paidout, if the daily/weekly was printed, and if the weekly has been invoiced and warn accordingly
                if (job) {
                    if (job.PaidOut) {
                        //Error here that has been paid out
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
                    input.JobID = job.ID;
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

                    input.JobID = newJob.ID;
                }
            } else {
                //Create the daily, weekly, and the job
                const newDaily = await ctx.prisma.dailies.create({
                    data: {
                        DriverID: DriverID,
                        Week: Week
                    }
                })

                let newWeekly = null;

                if (!weekly) {
                    newWeekly = await ctx.prisma.weeklies.create({
                        data: {
                            Week: Week,
                            CustomerID: CustomerID,
                            LoadTypeID: LoadTypeID,
                            DeliveryLocationID: DeliveryLocationID,
                            CompanyRate: (Math.round((TotalRate ?? 0) * 100)) / 100,
                        }
                    })
                }

                const newJob = await ctx.prisma.jobs.create({
                    data: {
                        DriverID: DriverID,
                        DailyID: newDaily.ID,
                        WeeklyID: newWeekly ? newWeekly.ID : weekly?.ID ?? 1,
                        CustomerID: CustomerID,
                        LoadTypeID: LoadTypeID,
                        DeliveryLocationID: DeliveryLocationID,
                        TruckingRate: (Math.round((TruckRate ?? 0) * 100)) / 100,
                        CompanyRate: (Math.round((TotalRate ?? 0) * 100)) / 100,
                        DriverRate: (Math.round((DriverRate ?? 0) * 100)) / 100,
                        MaterialRate: (Math.round((MaterialRate ?? 0) * 100)) / 100,
                    }
                })

                input.JobID = newJob.ID;
            }

            if (DriverID && TruckID) {
                await ctx.prisma.trucksDriven.create({
                    data: {TruckID, DriverID, DateDriven: StartDate}
                })
            }

            if (CustomerID && LoadTypeID) {
                await ctx.prisma.customerLoadTypes.create({
                    data: {CustomerID, LoadTypeID, DateDelivered: StartDate}
                })
            }

            if (CustomerID && DeliveryLocationID) {
                await ctx.prisma.customerDeliveryLocations.create({
                    data: {CustomerID, DeliveryLocationID, DateUsed: StartDate}
                })
            }

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

            const {DriverID, CustomerID, LoadTypeID, DeliveryLocationID, TruckRate, MaterialRate, Week, TotalRate, DriverRate} = input;

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
                        LoadTypeID: LoadTypeID
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
                        shouldReturn = item.TruckingRate === loadTR
                    } else {
                        shouldReturn = TruckRate === item.TruckingRate ?? 0;
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (MaterialRate) {
                        const loadMR = (Math.round(MaterialRate * 100)) / 100
                        shouldReturn = item.MaterialRate === loadMR
                    } else {
                        shouldReturn = MaterialRate === item.MaterialRate ?? 0;
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (DriverRate) {
                        const loadDR = (Math.round(DriverRate * 100)) / 100
                        shouldReturn = item.DriverRate === loadDR
                    } else {
                        shouldReturn = DriverRate === item.DriverRate ?? 0;
                    }
                    if (!shouldReturn) {
                        return false;
                    }
                    if (TotalRate) {
                        const loadTR = (Math.round(TotalRate * 100)) / 100
                        shouldReturn = item.CompanyRate === loadTR
                    } else {
                        shouldReturn = TotalRate === item.CompanyRate ?? 0;
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


