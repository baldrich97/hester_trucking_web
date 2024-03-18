import {createRouter} from "./context";
import {z} from "zod";
import {JobsModel} from '../../../prisma/zod';
import moment from "moment";

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
    .query('getByWeek', {
        input: z.object({
            week: z.string(),
        }),
        async resolve({ctx, input}) {
            const start = new Date(moment(input.week).format("YYYY-MM-DD 00:00:00"))
            const end = new Date(moment(input.week).add(6, "days").format("YYYY-MM-DD 23:59:59"))

            const jobs: any[] = [];

            const loads = await ctx.prisma.loads.findMany({
                where: {
                    Created: {
                        lte: end,
                        gte: start
                    }
                }
            });

            let shouldReturn = false;
            let shouldGroup = false;

            for (let i = 0; i < loads.length; i++) {
                const load = loads[i];
                if (!load) {
                    continue;
                }
                if (!load.JobID) {
                    continue;
                }
                const found = jobs.findIndex((job) => job.ID === load.JobID);
                if (found !== -1) {
                    jobs[found].Loads = [...jobs[found].Loads, load]
                } else {
                    const job = await ctx.prisma.jobs.findUnique({
                        where: {ID: load.JobID},
                        include: {Customers: true, Drivers: true, DeliveryLocations: true, LoadTypes: true}
                    });
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    job.Loads = [load];
                    jobs.push(job);
                }
                if (i === loads.length - 1) {
                    shouldGroup = true;
                }
            }

            const grouped: any[] = [];

            if (shouldGroup) {
                for (let i = 0; i < jobs.length; i++) {
                    const job = jobs[i];
                    if (!job) {
                        continue;
                    }
                    const found = grouped.findIndex((driver) => driver.ID === job.DriverID);
                    //console.log('FOUND', found, grouped, job)
                    if (found !== -1) {
                        grouped[found].Jobs = [...grouped[found].Jobs, job]
                    } else {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        grouped.push({...job.Drivers, Jobs: [job]});
                    }
                    if (i === jobs.length - 1) {
                        shouldReturn = true;
                    }
                }
            }

            if (shouldReturn) {
                return grouped;
            }

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

