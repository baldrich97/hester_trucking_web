import {createRouter} from "./context";
import {z} from "zod";
import {DailiesModel, JobsModel, WeekliesModel} from '../../../prisma/zod';

export const weekliesRouter = createRouter()
    .query('getByWeek', {
        input: z.object({
            week: z.string()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.weeklies.findMany({
                where: {
                    Week: input.week
                },
                include: {
                    Jobs: {
                        include: {
                            Loads:
                                {
                                    include: {Trucks: true}
                                },
                            Drivers: true
                        }
                    },
                    DeliveryLocations: true,
                    LoadTypes: true,
                    Customers: true
                }
            })
        }
    })
    .mutation('postClosed', {
        // validate input with Zod
        input: WeekliesModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.weeklies.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    })
    .query('getNotPrinted', {
        input: z.object({
            page: z.number()
        }),
        async resolve({ctx, input}) {
            const page = input.page;

            const result = await ctx.prisma.$queryRaw<
                Array<{ ID: number }>
            >`SELECT DISTINCT w.ID
              FROM Weeklies w
              WHERE w.LastPrinted IS NULL
                 OR w.ID IN
                    (SELECT w1.ID
                     FROM Weeklies w1
                              JOIN Jobs j ON w1.ID = j.WeeklyID
                              JOIN Loads l ON j.ID = l.JobID
                     WHERE w.LastPrinted IS NOT NULL
                       AND l.Created > w1.LastPrinted)
              ORDER BY w.ID ASC LIMIT 10
              OFFSET ${10 * (page - 1)};`;

            const countData = await ctx.prisma.$queryRaw<
                Array<{ count: number }>
            >`
                SELECT COUNT(DISTINCT w.ID) AS count
                FROM Weeklies w
                WHERE w.LastPrinted IS NULL
                   OR w.ID IN
                    (SELECT w1.ID
                    FROM Weeklies w1
                    JOIN Jobs j ON w1.ID = j.WeeklyID
                    JOIN Loads l ON j.ID = l.JobID
                    WHERE w.LastPrinted IS NOT NULL
                  AND l.Created > w1.LastPrinted)
            `;

            ctx.warnings.push(countData ? `${countData[0]?.count}` : '0')

            const ids = result.map(record => record.ID);

            const data = await ctx.prisma.weeklies.findMany({
                where: {
                    ID: {in: ids ?? []}
                },
                include: {
                    Jobs: {
                        include: {
                            Loads:
                                {
                                    include: {Trucks: true}
                                },
                            Drivers: true
                        }
                    },
                    DeliveryLocations: true,
                    LoadTypes: true,
                    Customers: true
                },
                orderBy: {ID: 'asc'}
            });

            return {data, warnings: ctx.warnings}
        }
    })
    .query('getByCustomer', {
        input: z.object({
            customer: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.weeklies.findMany({
                where: {
                    CustomerID: input.customer,
                    InvoiceID: null,
                    NOT: {
                        Revenue: null
                    },
                    Jobs: {
                        some: {
                            Loads: {
                                some: {}
                            }
                        }  // This ensures only weeklies with associated Jobs are fetched
                    }

                },
                include: {
                    Jobs: {
                        include: {
                            Drivers: true,
                            Loads: {
                                include: {
                                    Drivers: true,
                                    Trucks: true
                                }
                            }
                        }
                    },
                    DeliveryLocations: true,
                    LoadTypes: true
                }
            })

        }
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

