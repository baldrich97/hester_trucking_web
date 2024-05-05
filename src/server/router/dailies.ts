import {createRouter} from "./context";
import {z} from "zod";
import {DailiesModel} from '../../../prisma/zod';

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
            week: z.string()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.dailies.findMany({
                where: {
                    Week: input.week
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

