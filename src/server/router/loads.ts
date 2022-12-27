import {createRouter} from "./context";
import {z} from "zod";
import {LoadsModel} from '../../../prisma/zod';

export const loadsRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.loads.findMany({
                include: {
                    Customers: true,
                    Trucks: true,
                    Drivers: true,
                    LoadTypes: true,
                    DeliveryLocations: true
                },
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
    .mutation('put', {
        // validate input with Zod
        input: LoadsModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            const {DriverID, TruckID, StartDate, CustomerID, LoadTypeID} = input;
            if (DriverID && TruckID) {
                ctx.prisma.trucksDriven.create({
                    data: {TruckID, DriverID, DateDriven: StartDate}
                })
            }

            if (CustomerID && LoadTypeID) {
                const test = await ctx.prisma.customerLoadTypes.create({
                    data: {CustomerID, LoadTypeID, DateDelivered: StartDate}
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
    });

