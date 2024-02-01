import {createRouter} from "./context";
import {z} from "zod";
import {DeliveryLocationsModel} from '../../../prisma/zod';
import {DeliveryLocations} from "@prisma/client";

export const deliveryLocationsRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.deliveryLocations.findMany({
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
            return ctx.prisma.deliveryLocations.findUnique({
                where: {
                    ID: input.ID
                }
            })

        }
    })
    .query('search', {
        input: z.object({
            search: z.string().optional(),
            page: z.number().optional(),
            CustomerID: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const extra: DeliveryLocations[] = [];
            if (input.CustomerID) {
                const associated = await ctx.prisma.customerDeliveryLocations.findMany({
                    where: {CustomerID: input.CustomerID},
                    include: {DeliveryLocations: true}
                })
                associated.forEach((item) => {
                    if (extra.filter((_item) => _item.ID === item.DeliveryLocationID).length === 0) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        item.DeliveryLocations.Recommend = true;
                        extra.push(item.DeliveryLocations)
                    }
                })
            }
            const formattedSearch = input.search ? input.search.replace('"', '\"') : '';

            const {order, orderBy} = input;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            const extraCondition = extra.length > 0 ? {
                NOT: {
                    ID: {
                        in: extra.map((item) => item.ID)
                    }
                }
            } : {}
            let data = [];
            if (input.search && input.search.length > 0) {
                data = await ctx.prisma.deliveryLocations.findMany({
                    where: {
                        Description: {
                            search: formattedSearch
                        },
                        ...extraCondition
                    },
                    take: 50,
                    orderBy: orderObj,
                })
            } else {
                data = await ctx.prisma.deliveryLocations.findMany({
                    take: 50,
                    orderBy: orderObj,
                    where: {
                        ...extraCondition
                    },
                    skip: input.page ? input.page * 10 : 0
                })
            }

            return [...extra, ...data];

        }
    })
    .mutation('put', {
        // validate input with Zod
        input: DeliveryLocationsModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.deliveryLocations.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: DeliveryLocationsModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.deliveryLocations.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

