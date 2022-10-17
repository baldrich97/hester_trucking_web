import {createRouter} from "./context";
import {z} from "zod";
import { DeliveryLocationsModel } from '../../../prisma/zod';

export const deliveryLocationsRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.deliveryLocations.findMany();
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
            search: z.string()
        }),
        async resolve({ctx, input}) {
            const formattedSearch = `${input.search}*`;
            return ctx.prisma.deliveryLocations.findMany({
                where: {
                    Description: {
                        search: formattedSearch
                    },
                }
            })

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

