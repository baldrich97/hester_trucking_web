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

            console.log(orderObj, input)

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
            const {DriverID, TruckID, StartDate, CustomerID, LoadTypeID, DeliveryLocationID, TruckRate, MaterialRate} = input;

            if (DriverID && LoadTypeID && CustomerID && DeliveryLocationID) {
                let openJobs = await ctx.prisma.jobs.findMany({
                    where: {
                        AND: [
                            {TruckingRevenue: null},
                            {CompanyRevenue: null},
                            {DriverID: DriverID},
                            {CustomerID: CustomerID},
                            {LoadTypeID: LoadTypeID},
                            {DeliveryLocationID: DeliveryLocationID}
                        ]
                    }
                })

                openJobs = openJobs.filter((item) => {
                    let shouldReturn = true;
                    if (TruckRate) {
                        const loadTR = (Math.round(TruckRate * 100)) / 100
                        shouldReturn = item.TruckingRate === loadTR
                    } else {
                        shouldReturn = TruckRate === item.TruckingRate ?? 0;
                    }
                    if (!shouldReturn) {
                        return;
                    }
                    if (MaterialRate) {
                        const loadMR = (Math.round(MaterialRate * 100)) / 100
                        shouldReturn = item.CompanyRate === loadMR
                    } else {
                        shouldReturn = MaterialRate === item.CompanyRate ?? 0;
                    }
                    return shouldReturn;
                })

                if (openJobs.length > 1) {
                    //Error here that there are multiple open jobs that fit the criteria
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `There are multiple open jobs that fit these criteria. Please close similar jobs or contact support.`,
                    })
                } else if (openJobs[0]) {
                    //Set this load's JobID to the open job
                    input.JobID = openJobs[0].ID
                } else {
                    //Make a new job and set this load's JobID to it
                    const newJob = await ctx.prisma.jobs.create({
                        data: {
                            DriverID: DriverID,
                            LoadTypeID: LoadTypeID,
                            CustomerID: CustomerID,
                            TruckingRate: TruckRate ?? 0,
                            CompanyRate: MaterialRate ?? 0,
                            DeliveryLocationID: DeliveryLocationID
                        }
                    })
                    input.JobID = newJob.ID;
                }
            } else {
                //Error here that we could not create a job with this load due to missing information
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `This load is missing critical information. Please ensure there is a Driver, Load Type, Delivery Location, and Customer.`,
                })
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


