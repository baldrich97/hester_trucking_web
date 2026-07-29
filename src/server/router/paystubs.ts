import {createRouter} from "./context";
import {z} from "zod";
import {TRPCError} from "@trpc/server";
import {PayStubsModel} from '../../../prisma/zod';

export const paystubsRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.payStubs.findMany({
                take: 10,
                include: {
                    Drivers: true,
                    Jobs: true
                }
            }
            );
        },
    })
    .query('get', {
        input: z.object({
            ID: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.payStubs.findUnique({
                where: {
                    ID: input.ID
                },
                include: {
                    Drivers: true,
                    Jobs: true
                }
            })

        }
    })
    .query('search', {
        input: z.object({
            search: z.string(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const formattedSearch = input.search.replace('"', '\"');

            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            if (input.search.length > 0) {
                return ctx.prisma.payStubs.findMany({
                    where: {
                        Drivers: {
                            is: {
                                OR: [
                                    { FirstName: { contains: formattedSearch } },
                                    { LastName: { contains: formattedSearch } }
                                ]
                            }
                        }
                    },
                    orderBy: orderObj,
                    include: {
                        Drivers: true,
                        Jobs: true
                    },
                    take: 50,
                });
            }
            else {
                return ctx.prisma.payStubs.findMany({
                    orderBy: orderObj,
                    include: {
                        Drivers: true,
                        Jobs: true
                    },
                    take: 50,
                    skip: input.page ? 10 * input.page : 0
                })
            }

        }
    })
    .mutation('put', {
        input: PayStubsModel.omit({ID: true}).extend({selected: z.array(z.string())}),
        async resolve({ctx, input}) {
            const {selected, ...rest} = input;
            const driverId = rest.DriverID;

            if (!selected.length) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Select at least one job for this paystub.",
                });
            }

            const jobIds = selected.map((id) => parseInt(id, 10));
            const jobs = await ctx.prisma.jobs.findMany({
                where: {ID: {in: jobIds}},
                select: {ID: true, DriverID: true, PaidOut: true, PayStubID: true},
            });

            if (jobs.length !== jobIds.length) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "One or more selected jobs were not found.",
                });
            }

            for (const job of jobs) {
                if (job.DriverID !== driverId) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "All selected jobs must belong to the paystub driver.",
                    });
                }
                if (job.PaidOut) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "One or more selected jobs have already been paid out.",
                    });
                }
                if (job.PayStubID != null) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "One or more selected jobs are already on another paystub.",
                    });
                }
            }

            await ctx.prisma.$transaction(async (tx) => {
                const paystub = await tx.payStubs.create({data: rest});

                for (const jobId of jobIds) {
                    await tx.jobs.update({
                        where: {ID: jobId},
                        data: {
                            PayStubID: paystub.ID,
                            PaidOut: true,
                        },
                    });
                }
            });

            return true;
        },
    })
    .mutation('post', {
        input: PayStubsModel.extend({selected: z.array(z.string())}),
        async resolve({ctx, input}) {
            const {ID, selected, ...data} = input;
            return ctx.prisma.payStubs.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    }).mutation('postPrinted', {
        input: PayStubsModel.extend({selected: z.array(z.string())}),
        async resolve({ctx, input}) {
            const {ID} = input;
            return ctx.prisma.payStubs.update({
                where: {
                    ID: ID
                }, data: {
                    LastPrinted: new Date()
                }
            })
        },
    }).mutation('delete', {
        input: PayStubsModel,
        async resolve({ctx, input}) {
            const {ID} = input;

            await ctx.prisma.$transaction(async (tx) => {
                await tx.jobs.updateMany({
                    where: {PayStubID: ID},
                    data: {PaidOut: false, PayStubID: null},
                });
                await tx.payStubs.delete({where: {ID}});
            });

            return true;
        },
    });
