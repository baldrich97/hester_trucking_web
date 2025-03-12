import {createRouter} from "./context";
import {z} from "zod";
import {
    JobsModel,
    DriversModel,
    LoadsModel,
    CustomersModel,
    TrucksModel,
    LoadTypesModel,
    DeliveryLocationsModel,
    InvoicesModel,
    WeekliesModel
} from '../../../prisma/zod';
import moment from "moment";
import {formatDateToWeek} from "../../utils/UtilityFunctions";

type Driver = z.infer<typeof DriversModel>;

type Weekly = z.infer<typeof WeekliesModel>;

type Truck = z.infer<typeof TrucksModel>;

type Jobs = z.infer<typeof JobsModel>;

type Loads = z.infer<typeof LoadsModel>;

type Invoice = z.infer<typeof InvoicesModel>;

interface LoadsInvoices extends Loads {
    Invoices: Invoice | null
}

type Customer = z.infer<typeof CustomersModel>;

type LoadType = z.infer<typeof LoadTypesModel>;

type DeliveryLocation = z.infer<typeof DeliveryLocationsModel>;

interface DriversLoads extends Driver {
    Loads: LoadsInvoices[],
    Trucks: Truck
}

interface JobsLoads extends Jobs {
    Loads: Loads[]
}

interface DriverSheet extends Driver {
    Jobs: JobsLoads[]
}

interface Sheet extends LoadType {
    DeliveryLocations: DeliveryLocation,
    DriversTrucks: DriversLoads[],
}

interface CustomerSheet extends Customer {
    Sheets: Sheet[],
}

export const jobsRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.jobs.findMany({
                include: {
                    Drivers: true,
                },
                // where: {
                //     OR: [
                //         {
                //             Deleted: false
                //         },
                //         {
                //             Deleted: null
                //         }
                //     ],
                // },
                take: 10
            });
        },
    })
    // .query('get', {
    //     input: z.object({
    //         ID: z.number()
    //     }),
    //     async resolve({ctx, input}) {
    //         return ctx.prisma.dailies.findUnique({
    //             where: {
    //                 ID: input.ID
    //             }
    //         })

    //     }
    // })
    // .query('getByWeek', {
    //     input: z.object({
    //         week: z.string(),
    //         forDaily: z.boolean()
    //     }),
    //     async resolve({ctx, input}) {
    //         const start = new Date(moment(input.week).format("YYYY-MM-DD 00:00:00"))
    //         const end = new Date(moment(input.week).add(6, "days").format("YYYY-MM-DD 23:59:59"))
    //
    //         const loads = await ctx.prisma.loads.findMany({
    //             where: {
    //                 Created: {
    //                     lte: end,
    //                     gte: start
    //                 },
    //                 JobID: {
    //                     not: null
    //                 }
    //             },
    //             include: {
    //                 Customers: true, Drivers: true, DeliveryLocations: true, LoadTypes: true, Jobs: true, Trucks: true,
    //                 Invoices: true, Weeklies: true
    //             }
    //         })
    //
    //         if (input.forDaily) {
    //             const sheets: DriverSheet[] = [];
    //             await Promise.all(loads.map((load) => {
    //                 const {Drivers, Customers, DeliveryLocations, LoadTypes, Jobs, ...rest} = load;
    //                 const foundSheet = sheets.findIndex((item) => item.ID === load.DriverID)
    //                 if (foundSheet !== -1) {
    //                     //if a sheet already exists for this driver, set sheet to the found sheet
    //                     const sheet = sheets[foundSheet];
    //                     if (!sheet) {
    //                         return;
    //                     }
    //                     if (sheet.Jobs) {
    //                         const foundJob = sheet.Jobs.findIndex((item) => item.ID === load.JobID)
    //                         if (foundJob !== -1) {
    //                             //if the existing sheet already had a job that matches this load's jobid, set job to the found job
    //                             const job = sheet.Jobs[foundJob];
    //                             if (!job) {
    //                                 return;
    //                             }
    //                             //set the job's loads = it's loads plus the new one, then set the sheet's job to the job, then set the sheet in the array to the new sheet
    //                             job.Loads = [...job.Loads, {...rest}]
    //                             sheet.Jobs[foundJob] = job;
    //                             sheets[foundSheet] = sheet;
    //                         } else {
    //                             if (!Jobs) {
    //                                 return;
    //                             }
    //                             //add the new job to the Jobs
    //                             sheet.Jobs = [...sheet.Jobs, {...Jobs, Loads: [{...rest}]}]
    //                             sheets[foundSheet] = sheet;
    //                         }
    //                     } else {
    //                         if (!Jobs) {
    //                             return;
    //                         }
    //                         sheet.Jobs = [{
    //                             ...Jobs,
    //                             Loads: [{...rest}],
    //                             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //                             // @ts-ignore
    //                             Customers: Customers,
    //                             DeliveryLocations: DeliveryLocations,
    //                             LoadTypes: LoadTypes
    //                         }]
    //                     }
    //                 } else {
    //                     if (!Jobs || !Drivers) {
    //                         return;
    //                     }
    //                     sheets.push({
    //                         ...Drivers,
    //                         Jobs: [{
    //                             ...Jobs,
    //                             Loads: [{...rest}],
    //                             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //                             // @ts-ignore
    //                             Customers: Customers,
    //                             DeliveryLocations: DeliveryLocations,
    //                             LoadTypes: LoadTypes
    //                         }]
    //                     })
    //                 }
    //             }))
    //
    //             return sheets;
    //         } else {
    //             const sheets: CustomerSheet[] = [];
    //             await Promise.all(loads.map((load) => {
    //                 const {Drivers, Customers, DeliveryLocations, LoadTypes, Jobs, Trucks, Weeklies, ...rest} = load;
    //                 const foundSheet = sheets.findIndex((item) => item.ID === load.CustomerID)
    //                 if (foundSheet !== -1) {
    //                     //if a sheet already exists for this driver, set sheet to the found sheet
    //                     const sheet = sheets[foundSheet];
    //                     if (!sheet) {
    //                         return;
    //                     }
    //                     if (sheet.Sheets) {
    //                         const foundJob = sheet.Sheets.findIndex((item) => item.ID === load.LoadTypeID && item.DeliveryLocations?.ID === load.DeliveryLocationID)
    //                         if (foundJob !== -1) {
    //                             //if the existing sheet already had a job that matches this load's jobid, set job to the found job
    //                             const job = sheet.Sheets[foundJob];
    //                             if (!job || !Trucks || !Drivers) {
    //                                 return;
    //                             }
    //                             //set the job's loads = it's loads plus the new one, then set the sheet's job to the job, then set the sheet in the array to the new sheet
    //
    //                             const foundDriverTruck = job.DriversTrucks.findIndex((item) => item.ID === load.DriverID && item.Trucks?.ID === load.TruckID);
    //                             if (foundDriverTruck !== -1) {
    //                                 const driverTruck = job.DriversTrucks[foundDriverTruck];
    //                                 if (!driverTruck) {
    //                                     return;
    //                                 }
    //                                 driverTruck.Loads = [...driverTruck.Loads, {...rest}]
    //                             } else {
    //                                 job.DriversTrucks = [...job.DriversTrucks, {...Drivers, Trucks: Trucks, Loads: [{...rest}]}]
    //                             }
    //
    //                             sheet.Sheets[foundJob] = job;
    //                             sheets[foundSheet] = sheet;
    //                         } else {
    //                             if (!Jobs || !Drivers || !Trucks || !DeliveryLocations || !LoadTypes) {
    //                                 return;
    //                             }
    //                             //add the new job to the Jobs
    //
    //                             sheet.Sheets = [...sheet.Sheets, {...LoadTypes, DeliveryLocations: DeliveryLocations, DriversTrucks: [{...Drivers, Trucks: Trucks, Loads: [{...rest}]}]}]
    //                             sheets[foundSheet] = sheet;
    //                         }
    //                     } else {
    //                         if (!Jobs || !Drivers || !Trucks || !DeliveryLocations || !LoadTypes) {
    //                             return;
    //                         }
    //                         sheet.Sheets = [{...LoadTypes, DeliveryLocations: DeliveryLocations, DriversTrucks: [{...Drivers, Trucks: Trucks, Loads: [{...rest}]}]}]
    //                     }
    //                 } else {
    //                     if (!Jobs || !Drivers || !Trucks || !DeliveryLocations || !LoadTypes) {
    //                         return;
    //                     }
    //                     sheets.push({
    //                         ...Customers,
    //                         Sheets: [{...LoadTypes, DeliveryLocations: DeliveryLocations, DriversTrucks: [{...Drivers, Trucks: Trucks, Loads: [{...rest}]}]}]
    //                     })
    //                 }
    //             }))
    //
    //             return sheets;
    //         }

    // let shouldReturn = false;
    // let shouldGroup = false;
    //
    // for (let i = 0; i < loads.length; i++) {
    //     const load = loads[i];
    //     if (!load) {
    //         continue;
    //     }
    //     if (!load.JobID) {
    //         continue;
    //     }
    //     const found = jobs.findIndex((job) => job.ID === load.JobID);
    //     if (found !== -1) {
    //         jobs[found].Loads = [...jobs[found].Loads, load]
    //     } else {
    //         const job = await ctx.prisma.jobs.findUnique({
    //             where: {ID: load.JobID},
    //             include: {Customers: true, Drivers: true, DeliveryLocations: true, LoadTypes: true}
    //         });
    //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //         // @ts-ignore
    //         job.Loads = [load];
    //         jobs.push(job);
    //     }
    //     if (i === loads.length - 1) {
    //         shouldGroup = true;
    //     }
    // }
    //
    // const grouped: any[] = [];
    //
    // if (shouldGroup) {
    //     for (let i = 0; i < jobs.length; i++) {
    //         const job = jobs[i];
    //         if (!job) {
    //             continue;
    //         }
    //         const found = grouped.findIndex((driver) => driver.ID === job.DriverID);
    //         //console.log('FOUND', found, grouped, job)
    //         if (found !== -1) {
    //             grouped[found].Jobs = [...grouped[found].Jobs, job]
    //         } else {

    //             grouped.push({...job.Drivers, Jobs: [job]});
    //         }
    //         if (i === jobs.length - 1) {
    //             shouldReturn = true;
    //         }
    //     }
    // }
    //
    // if (shouldReturn) {
    //     return grouped;
    // }

    //     }
    // })
    // .query('search', {
    //     input: z.object({
    //         search: z.string(),
    //         page: z.number().optional(),
    //         orderBy: z.string().optional(),
    //         order: z.string().optional()
    //     }),
    //     async resolve({ctx, input}) {
    //         const formattedSearch = input.search.replace('"', '\"');

    //         const {order, orderBy} = input;

    //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //         // @ts-ignore
    //         const orderObj = {};
    //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //         // @ts-ignore
    //         orderObj[orderBy] = order;

    //         if (input.search.length > 0) {
    //             return ctx.prisma.dailies.findMany({
    //                 where: {
    //                     OR: [
    //                         {
    //                             Name: {
    //                                 contains: formattedSearch
    //                             }
    //                         },
    //                         {
    //                             Street: {
    //                                 contains: formattedSearch
    //                             }
    //                         },
    //                         {
    //                             City: {
    //                                 contains: formattedSearch
    //                             }
    //                         },
    //                         {
    //                             ZIP: {
    //                                 contains: formattedSearch
    //                             }
    //                         },
    //                         {
    //                             Email: {
    //                                 contains: formattedSearch
    //                             }
    //                         },
    //                         {
    //                             Phone: {
    //                                 contains: formattedSearch
    //                             }
    //                         },
    //                         {
    //                             MainContact: {
    //                                 contains: formattedSearch
    //                             }
    //                         },
    //                         {
    //                             Notes: {
    //                                 contains: formattedSearch
    //                             }
    //                         }
    //                     ]
    //                 },
    //                 orderBy: orderObj,
    //                 include: {
    //                     States: true
    //                 },
    //                 take: 50,
    //             })
    //         } else {
    //             return ctx.prisma.dailies.findMany({
    //                 orderBy: orderObj,
    //                 include: {
    //                     States: true
    //                 },
    //                 take: 50,
    //                 skip: input.page ? 10 * input.page : 0
    //             })
    //         }

    //     }
    // })
    .query('getByDriver', {
        input: z.object({
            driver: z.number()
        }),
        async resolve({ctx, input}) {
            const driver = await ctx.prisma.drivers.findUnique({where: {ID: input.driver}})
            const ownerOperator = !!driver?.OwnerOperator;
            const date = new Date();
            const defaultWeek = formatDateToWeek(date);

            //removed from below for now
            //AND (${ownerOperator} = true OR ${ownerOperator} = false)
            const jobIds =
                await ctx.prisma.$queryRaw<Array<{ ID: number }>>`SELECT DISTINCT(j.ID)
                                                                  FROM Jobs j
                                                                           LEFT JOIN Weeklies w ON j.WeeklyID = w.ID
                                                                           LEFT JOIN Invoices i ON w.InvoiceID = i.ID
                                                                           LEFT JOIN PayStubs ps ON j.PayStubID = ps.ID
                                                                           LEFT JOIN Loads l ON i.ID = l.InvoiceID
                                                                  WHERE j.DriverID = ${input.driver}
                                                                    AND (j.PaidOut != TRUE OR (j.PayStubID IS NOT NULL AND (SELECT MAX(l1.Created) FROM Loads l1 WHERE l1.JobID = j.ID) > ps.Created))
                                                                    AND w.Week != ${defaultWeek}
                                                                    AND (SELECT MAX(l2.StartDate) FROM Loads l2 WHERE l2.JobID = j.ID) >= "2025-02-01"
                                                                    AND (SELECT COUNT(*) FROM Loads l3 WHERE l3.JobID = j.ID) > 0
                                                                  ORDER BY l.StartDate ASC;`

            const ids = jobIds.map(record => record.ID);

            return ctx.prisma.jobs.findMany({
                where: {
                    ID: {
                        in: ids ?? []
                    }
                },
                include: {
                    Drivers: true,
                    LoadTypes: {
                        select: {
                            Description: true
                        }
                    },
                    DeliveryLocations: {
                        select: {
                            Description: true
                        }
                    },
                    Customers: {
                        select: {
                            Name: true
                        }
                    },
                    Loads: {
                        orderBy: {
                            StartDate: 'asc' // Order the loads by the oldest StartDate
                        }
                    },
                    Weeklies: {
                        include: {
                            Invoices: {
                                select: {
                                    Paid: true
                                }
                            }
                        }
                    }
                },
            });


        }
    })
    .mutation('postClosed', {
        // validate input with Zod
        input: JobsModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // check if weekly is closed and warn/error?
            const weekly = await ctx.prisma.weeklies.findFirst({
                where: {
                    ID: data.WeeklyID
                }
            })

            if (!weekly || weekly.Revenue !== null) {
                //warn/error here
            }
            // use your ORM of choice
            return ctx.prisma.jobs.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    })
    .mutation('postPaid', {
        // validate input with Zod
        input: JobsModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.jobs.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    })
// .mutation('post', {
//     // validate input with Zod
//     input: DailiesModel,
//     async resolve({ctx, input}) {
//         const {ID, ...data} = input;
//         // use your ORM of choice
//         return ctx.prisma.dailies.update({
//             where: {
//                 ID: ID
//             }, data: data
//         })
//     },
// });

