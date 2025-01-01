import {createRouter} from "./context";
import {z} from "zod";
import {DailiesModel} from '../../../prisma/zod';
import {formatDateToWeek} from "../../utils/UtilityFunctions";

export const dailiesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.dailies.findMany({
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
    .query('getByWeek', {
        input: z.object({
            week: z.string(),
            filterOperator: z.boolean().optional(),
            filterW2: z.boolean().optional(),
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.dailies.findMany({
                where: {
                    Week: input.week,
                    ...(input.filterW2 && {Drivers: {OwnerOperator: {not: true}}}),
                    ...(input.filterOperator && {Drivers: {OwnerOperator: true}}),
                },
                include: {
                    Jobs: {
                        include: {
                            Loads: true,
                            Customers: true,
                            LoadTypes: true,
                            DeliveryLocations: true
                        }
                    },
                    Drivers: true
                }
            })
        }
    })
    .query('getByWeekW2', {
        input: z.object({
            page: z.number()
        }),
        async resolve({ctx, input}) {
            const date = new Date();
            const defaultWeek = formatDateToWeek(date);
            const page = input.page;

            const result = await ctx.prisma.$queryRaw<
                Array<{ ID: number }>
            >`SELECT DISTINCT Dailies.ID
  FROM Dailies
           JOIN Drivers ON Dailies.DriverID = Drivers.ID
           JOIN Jobs ON Jobs.DailyID = Dailies.ID
           LEFT JOIN Loads ON Loads.JobID = Jobs.ID
           LEFT JOIN PayStubs ON Jobs.PayStubID = PayStubs.ID
  WHERE Drivers.OwnerOperator <> TRUE
    AND Dailies.Week != ${defaultWeek}
    AND (
        Jobs.PaidOut <> TRUE
        OR (Jobs.PayStubID IS NOT NULL AND Loads.Created > PayStubs.Created)
    )
  ORDER BY Dailies.ID ASC
  LIMIT 10 OFFSET ${10 * (page - 1)};`;


// Flatten the array to just IDs
            const ids = result.map(record => record.ID);

            const countData = await ctx.prisma.$queryRaw<
                Array<{ count: number }>
            >`
                SELECT COUNT(DISTINCT Dailies.ID) AS count
                FROM Dailies
                    JOIN Drivers
                ON Dailies.DriverID = Drivers.ID
                    JOIN Jobs ON Jobs.DailyID = Dailies.ID
                    LEFT JOIN Loads ON Loads.JobID = Jobs.ID
                    LEFT JOIN PayStubs ON Jobs.PayStubID = PayStubs.ID
                WHERE Drivers.OwnerOperator <> TRUE
                  AND Dailies.Week != ${defaultWeek}
                  AND (
                    Jobs.PaidOut <> TRUE
                   OR (Jobs.PayStubID IS NOT NULL
                  AND Loads.Created
                    > PayStubs.Created)
                    );
            `;

            ctx.warnings.push(countData ? `${countData[0]?.count}` : '0')

            const data = await ctx.prisma.dailies.findMany({
                where: {
                    ID: {in: ids ?? []}
                },
                include: {
                    Jobs: {
                        include: {
                            Loads: true,
                            Customers: true,
                            LoadTypes: true,
                            DeliveryLocations: true
                        }
                    },
                    Drivers: true
                }
            });

            return {data, warnings: ctx.warnings}

        }
    })
    .query('getByWeekOperator', {
        input: z.object({
            page: z.number()
        }),
        async resolve({ctx, input}) {
            // Step 1: Query the Weeklies table
            const weeklies = await ctx.prisma.weeklies.findMany({
                where: {
                    Invoices: {
                        Paid: true, // Ensure the related Invoice has Paid set to true
                    },
                    Jobs: {
                        some: {
                            Drivers: {OwnerOperator: true},
                            PaidOut: {not: true}, // Ensure there are Jobs where PaidOut is false
                        },
                    },
                },
                include: {
                    Jobs: {
                        select: {
                            DailyID: true, // Get the DailyID from Jobs
                            PaidOut: true
                        },
                    },
                },
            });

            // Step 2: Extract the DailyIDs from the Jobs
            const dailyIds = weeklies.flatMap(weekly => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return weekly.Jobs.filter(job => !job.PaidOut).map(job => job.DailyID)
        });

            const weeklyIds = weeklies.map((weekly) => weekly.ID);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const uniqueIds: number[] = [...new Set(dailyIds)];

            // Step 3: Query the Dailies table based on the extracted DailyIDs
            const data = await ctx.prisma.dailies.findMany({
                where: {
                    ID: {in: uniqueIds}, // Filter by the DailyIDs obtained from the Weeklies jobs
                },
                include: {
                    Jobs: {
                        include: {
                            Loads: true,
                            Customers: true,
                            LoadTypes: true,
                            DeliveryLocations: true,
                        },
                        where: {
                            WeeklyID: {
                                in: weeklyIds && weeklyIds.length > 0 ? weeklyIds : [],
                            },
                        },
                    },
                    Drivers: true,
                },
                orderBy: {ID: 'asc'},
                take: 10,
                skip: (input.page - 1) * 10
            });

            return {data, warnings: [uniqueIds.length]}
        },
    });

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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
//         const orderObj = {};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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
// .mutation('put', {
//     // validate input with Zod
//     input: DailiesModel.omit({ID: true, Deleted: true}),
//     async resolve({ctx, input}) {
//         // use your ORM of choice
//         return ctx.prisma.dailies.create({
//             data: input
//         })
//     },
// })
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

