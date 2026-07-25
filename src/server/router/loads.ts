import {createRouter} from "./context";
import {z} from "zod";
import {LoadsModel} from '../../../prisma/zod';
import {TRPCError} from "@trpc/server";
import {isSourcesCutoverActive, NEW_LOAD_TYPE_ID_THRESHOLD} from "../../config/sourcesCutover";
import {rematchLoadToJob} from "../loadRematch";

type loadType = z.infer<typeof LoadsModel>;

const loadsListInput = z.object({
    page: z.number().optional(),
    customer: z.number().optional(),
    truck: z.number().optional(),
    driver: z.number().optional(),
    loadType: z.number().optional(),
    deliveryLocation: z.number().optional(),
    orderBy: z.string().optional(),
    order: z.string().optional(),
    search: z.number().nullish().optional(),
    chosenLoad: z.any().optional(),
});

function buildLoadFilters(input: z.infer<typeof loadsListInput>) {
    const {customer, driver, truck, loadType, deliveryLocation, search, chosenLoad} = input;
    const epsilon = 0.001;
    return {
        ...(customer && {CustomerID: customer}),
        ...(driver && {DriverID: driver}),
        ...(truck && {TruckID: truck}),
        ...(loadType && {LoadTypeID: loadType}),
        ...(deliveryLocation && {DeliveryLocationID: deliveryLocation}),
        ...(search && {TicketNumber: search}),
        ...(chosenLoad?.MaterialRate && {
            MaterialRate: {gte: chosenLoad.MaterialRate - epsilon, lte: chosenLoad.MaterialRate + epsilon},
        }),
        ...(chosenLoad?.TruckRate && {
            TruckRate: {gte: chosenLoad.TruckRate - epsilon, lte: chosenLoad.TruckRate + epsilon},
        }),
        ...(chosenLoad?.DriverRate && {
            DriverRate: {gte: chosenLoad.DriverRate - epsilon, lte: chosenLoad.DriverRate + epsilon},
        }),
        ...(chosenLoad?.TotalRate && {
            TotalRate: {gte: chosenLoad.TotalRate - epsilon, lte: chosenLoad.TotalRate + epsilon},
        }),
        ...(chosenLoad?.StartDate && {StartDate: chosenLoad.StartDate}),
        ...(chosenLoad?.Week && {Week: chosenLoad.Week}),
    };
}

const loadListInclude = {
    Customers: {select: {Name: true}},
    Trucks: {select: {Name: true, Active: true}},
    Drivers: {select: {FirstName: true, LastName: true, Active: true}},
    LoadTypes: {select: {Description: true}},
    DeliveryLocations: {select: {Description: true}},
    Sources: {select: {Name: true, ShortName: true}},
};

const activeLoadWhere = {
    OR: [{Deleted: false}, {Deleted: null}],
};


async function upsertSourceLoadType(ctx: any, SourceID: number, LoadTypeID: number) {
    await ctx.prisma.sourceLoadTypes.upsert({
        where: {SourceID_LoadTypeID: {SourceID, LoadTypeID}},
        create: {SourceID, LoadTypeID, UseCount: 1},
        update: {UseCount: {increment: 1}},
    });
}

async function updateLoadAndRelations(
    input: any,
    ctx: any,
    mass_edit_ids: any = null
): Promise<void> {

    const {ID, SourceID, ...rest} = input;
    const data = {...rest};

    const rematch = await rematchLoadToJob(ctx, {
        DriverID: input.DriverID,
        CustomerID: input.CustomerID,
        LoadTypeID: input.LoadTypeID,
        DeliveryLocationID: input.DeliveryLocationID,
        Week: input.Week,
        TruckRate: input.TruckRate,
        MaterialRate: input.MaterialRate,
        DriverRate: input.DriverRate,
        TotalRate: input.TotalRate,
        SourceID,
    });

    data.JobID = rematch.JobID;
    if (isSourcesCutoverActive()) {
        data.SourceID = rematch.SourceID;
    }

    if (!mass_edit_ids) {
        const result = await ctx.prisma.loads.update({
            where: {ID},
            data,
        });
        if (isSourcesCutoverActive() && SourceID && input.LoadTypeID) {
            await upsertSourceLoadType(ctx, SourceID, input.LoadTypeID);
        }
        return result;
    }

    const massData: Record<string, unknown> = {
        CustomerID: data.CustomerID,
        DriverID: data.DriverID,
        TruckID: data.TruckID,
        LoadTypeID: data.LoadTypeID,
        DeliveryLocationID: data.DeliveryLocationID,
        StartDate: data.StartDate,
        Week: data.Week,
        MaterialRate: data.MaterialRate,
        TruckRate: data.TruckRate,
        DriverRate: data.DriverRate,
        TotalRate: data.TotalRate,
        JobID: data.JobID,
    };
    if (isSourcesCutoverActive()) {
        massData.SourceID = data.SourceID;
    }

    await ctx.prisma.loads.updateMany({
        where: {ID: {in: mass_edit_ids}},
        data: massData,
    });
    if (isSourcesCutoverActive() && SourceID && input.LoadTypeID) {
        await upsertSourceLoadType(ctx, SourceID, input.LoadTypeID);
    }
}

export const loadsRouter = createRouter()
    .query("getAllPage", {
        input: loadsListInput,
        async resolve({ctx, input}) {
            const {order, orderBy, page} = input;
            const extra = buildLoadFilters(input);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;
            const where = {...activeLoadWhere, ...extra};
            const [rows, count] = await Promise.all([
                ctx.prisma.loads.findMany({
                    include: loadListInclude,
                    orderBy: orderObj,
                    where,
                    take: 10,
                    skip: page ? 10 * page : 0,
                }),
                ctx.prisma.loads.count({where}),
            ]);
            return {rows, count};
        },
    })
    .query("getUninvPage", {
        input: loadsListInput.omit({chosenLoad: true}),
        async resolve({ctx, input}) {
            const {page} = input;
            const extra = buildLoadFilters(input);
            const where = {...activeLoadWhere, Invoiced: null, ...extra};
            const [rows, count] = await Promise.all([
                ctx.prisma.loads.findMany({
                    include: loadListInclude,
                    orderBy: {StartDate: "asc"},
                    where,
                    take: 10,
                    skip: page ? 10 * page : 0,
                }),
                ctx.prisma.loads.count({where}),
            ]);
            return {rows, count};
        },
    })
    .query("getAll", {
        input: loadsListInput,
        async resolve({ctx, input}) {
            const {
                customer,
                driver,
                truck,
                loadType,
                deliveryLocation,
                search,
                order,
                orderBy,
                page,
                chosenLoad
            } = input;
            const extra = buildLoadFilters(input);


            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            //const extra = input.customer !== 0 ? {AND: {CustomerID: input.customer}} : {};
            return ctx.prisma.loads.findMany({
                include: {
                    Customers: {select: {Name: true}},
                    Trucks: {select: {Name: true, Active: true}},
                    Drivers: {select: {FirstName: true, LastName: true, Active: true}},
                    LoadTypes: {select: {Description: true}},
                    DeliveryLocations: {select: {Description: true}},
                },
                orderBy: orderObj,
                where: {
                    ...activeLoadWhere,
                    ...extra
                },
                take: 10,
                skip: page ? 10 * page : 0
            });
        },
    })
    .query("getUninv", {
        input: loadsListInput.omit({chosenLoad: true}),
        async resolve({ctx, input}) {
            const {
                customer,
                driver,
                truck,
                loadType,
                deliveryLocation,
                search,
                order,
                orderBy,
                page
            } = input;
            const extra = buildLoadFilters(input);


            //const extra = input.customer !== 0 ? {AND: {CustomerID: input.customer}} : {};
            return ctx.prisma.loads.findMany({
                include: {
                    Customers: {select: {Name: true}},
                    Trucks: {select: {Name: true, Active: true}},
                    Drivers: {select: {FirstName: true, LastName: true, Active: true}},
                    LoadTypes: {select: {Description: true}},
                    DeliveryLocations: {select: {Description: true}},
                },
                orderBy: {
                    StartDate: 'asc'
                },
                where: {
                    ...activeLoadWhere,
                    Invoiced: null,
                    ...extra
                },
                take: 10,
                skip: page ? 10 * page : 0
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
                        {CustomerID: input.customer},
                        {OR: [{Deleted: false}, {Deleted: null}]},
                        {OR: [{Invoiced: false}, {Invoiced: null}]},
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
                    Trucks: true,
                    Sources: true,
                }
            })
        }
    })
    .query('openLegacyJobs', {
        input: z.object({
            DriverID: z.number(),
            Week: z.string(),
            CustomerID: z.number().optional(),
            DeliveryLocationID: z.number().optional(),
        }),
        async resolve({ctx, input}) {
            if (!isSourcesCutoverActive()) {
                return [];
            }

            const daily = await ctx.prisma.dailies.findFirst({
                where: {DriverID: input.DriverID, Week: input.Week},
            });
            if (!daily) {
                return [];
            }

            const jobs = await ctx.prisma.jobs.findMany({
                where: {
                    DailyID: daily.ID,
                    PaidOut: {not: true},
                    LoadTypeID: {lt: NEW_LOAD_TYPE_ID_THRESHOLD},
                    ...(input.CustomerID ? {CustomerID: input.CustomerID} : {}),
                    ...(input.DeliveryLocationID ? {DeliveryLocationID: input.DeliveryLocationID} : {}),
                    Weeklies: {InvoiceID: null},
                },
                include: {
                    Customers: {select: {ID: true, Name: true}},
                    LoadTypes: {select: {ID: true, Description: true}},
                    DeliveryLocations: {select: {ID: true, Description: true}},
                },
                orderBy: {ID: "asc"},
            });

            return jobs.map((job) => ({
                JobID: job.ID,
                CustomerID: job.CustomerID,
                CustomerName: job.Customers.Name,
                LoadTypeID: job.LoadTypeID,
                LoadTypeDescription: job.LoadTypes.Description,
                DeliveryLocationID: job.DeliveryLocationID,
                DeliveryLocationDescription: job.DeliveryLocations.Description,
                TruckingRate: job.TruckingRate,
                MaterialRate: job.MaterialRate,
                DriverRate: job.DriverRate,
                CompanyRate: job.CompanyRate,
            }));
        },
    })
    .query('getCount', {
        input: z.object({
            page: z.number().optional(),
            customer: z.number().optional(),
            truck: z.number().optional(),
            driver: z.number().optional(),
            loadType: z.number().optional(),
            deliveryLocation: z.number().optional(),
            search: z.number().nullish().optional(),
            chosenLoad: z.any().optional()
        }),
        async resolve({ctx, input}) {
            const {customer, driver, truck, loadType, deliveryLocation, search, chosenLoad} = input;
            const epsilon = 0.001;
            const extra = {
                ...(customer && {CustomerID: customer}),
                ...(driver && {DriverID: driver}),
                ...(truck && {TruckID: truck}),
                ...(loadType && {LoadTypeID: loadType}),
                ...(deliveryLocation && {DeliveryLocationID: deliveryLocation}),
                ...(search && {TicketNumber: search}),
                ...(chosenLoad?.MaterialRate && {
                    MaterialRate: {
                        gte: chosenLoad.MaterialRate - epsilon,
                        lte: chosenLoad.MaterialRate + epsilon
                    }
                }),
                ...(chosenLoad?.TruckRate && {
                    TruckRate: {
                        gte: chosenLoad.TruckRate - epsilon,
                        lte: chosenLoad.TruckRate + epsilon
                    }
                }),
                ...(chosenLoad?.DriverRate && {
                    DriverRate: {
                        gte: chosenLoad.DriverRate - epsilon,
                        lte: chosenLoad.DriverRate + epsilon
                    }
                }),
                ...(chosenLoad?.TotalRate && {
                    TotalRate: {
                        gte: chosenLoad.TotalRate - epsilon,
                        lte: chosenLoad.TotalRate + epsilon
                    }
                }),
                ...(chosenLoad?.StartDate && {StartDate: chosenLoad.StartDate}),
                ...(chosenLoad?.Week && {Week: chosenLoad.Week}),
            };

            return ctx.prisma.loads.count({
                where: {...activeLoadWhere, ...extra},
            });
        }
    })
    .query('getUninvCount', {
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
            const {customer, driver, truck, loadType, deliveryLocation, search} = input;
            const epsilon = 0.001;
            const extra = {
                ...(customer && {CustomerID: customer}),
                ...(driver && {DriverID: driver}),
                ...(truck && {TruckID: truck}),
                ...(loadType && {LoadTypeID: loadType}),
                ...(deliveryLocation && {DeliveryLocationID: deliveryLocation}),
                ...(search && {TicketNumber: search}),
            };

            return ctx.prisma.loads.count({
                where: {
                    ...activeLoadWhere,
                    Invoiced: null,
                    ...extra
                }
            });

        }
    })
    .mutation('put_duplicate_checker', {
        input: LoadsModel.omit({ID: true, Deleted: true}).extend({SourceID: z.number().int().nullish()}),
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
    .mutation('post_mass_edit', {
        input: z.object({
            selectedLoads: z.array(z.number()).optional(),
            data: LoadsModel.omit({ID: true, Deleted: true}).extend({SourceID: z.number().int().nullish()}).optional()
        }),
        async resolve({ctx, input}) {
            if (!input.data) {
                return false;
            }
            // await ctx.prisma.loads.updateMany({
            //     where: {
            //         ID: { in: input.selectedLoads }
            //     },
            //     data: {
            //         CustomerID: input.data.CustomerID,
            //         DriverID: input.data.DriverID,
            //         TruckID: input.data.TruckID,
            //         LoadTypeID: input.data.LoadTypeID,
            //         DeliveryLocationID: input.data.DeliveryLocationID,
            //         StartDate: input.data.StartDate,
            //         Week: input.data.Week,
            //         MaterialRate: input.data.MaterialRate,
            //         TruckRate: input.data.TruckRate,
            //         DriverRate: input.data.DriverRate,
            //         TotalRate: input.data.TotalRate,
            //     },
            // });

            //Also need to update the Weekly/Daily/Job
            await updateLoadAndRelations(input.data, ctx, input.selectedLoads)

            return true;
        }
    })
    .mutation('post_duplicate_checker', {
        input: LoadsModel.extend({SourceID: z.number().int().nullish()}),
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
        input: LoadsModel.omit({ID: true, Deleted: true}).extend({SourceID: z.number().int().nullish()}),
        async resolve({ctx, input}) {
            const {
                DriverID, TruckID, StartDate, CustomerID, LoadTypeID,
                DeliveryLocationID, TruckRate, MaterialRate, Week,
                TotalRate, DriverRate, Weight, Hours, SourceID
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

            if (!Weight && !Hours) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'This load is missing either weight or hours.'
                })
            }

            if (!DriverID || !DeliveryLocationID || !LoadTypeID || !TruckID || !CustomerID) {
                return;
            }

            const rematch = await rematchLoadToJob(ctx, {
                DriverID,
                CustomerID,
                LoadTypeID,
                DeliveryLocationID,
                Week,
                TruckRate,
                MaterialRate,
                DriverRate,
                TotalRate,
                SourceID,
            });
            input.JobID = rematch.JobID;
            if (isSourcesCutoverActive()) {
                input.SourceID = rematch.SourceID;
            } else {
                input.SourceID = undefined;
            }

            const daily = await ctx.prisma.dailies.findFirst({where: {DriverID, Week}});
            if (daily?.LastPrinted) {
                ctx.warnings.push('This daily has already been printed.', daily.Week, daily.DriverID.toString());
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
            const loadCreateData = {...input};
            if (!isSourcesCutoverActive()) {
                delete loadCreateData.SourceID;
            }
            const data = await ctx.prisma.loads.create({data: loadCreateData});

            if (isSourcesCutoverActive() && SourceID && LoadTypeID) {
                await upsertSourceLoadType(ctx, SourceID, LoadTypeID);
            }

            return {data, warnings: ctx.warnings};
        },
    }).mutation('post', {
        // validate input with Zod
        input: LoadsModel.extend({SourceID: z.number().int().nullish()}),
        async resolve({ctx, input}) {
            const {
                DriverID,
                CustomerID,
                LoadTypeID,
                DeliveryLocationID,

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

            return await updateLoadAndRelations(input, ctx);

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


