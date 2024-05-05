import { DeliveryLocations } from '@prisma/client';
import {createRouter} from "./context";
import {z} from "zod";
import { CustomerDeliveryLocationsModel } from '../../../prisma/zod';

type CustomerDeliveryLocationsType = z.infer<typeof CustomerDeliveryLocationsModel>;

export const customerDeliveryLocationsRouter = createRouter()
    .query("getAll", {
        input: z.object({
            CustomerID: z.number(),
            page: z.number().optional()
        }),
        async resolve({ctx, input}) {
            const data = ctx.prisma.customerDeliveryLocations.findMany({
                where: {
                    CustomerID: input.CustomerID
                },
                include: {
                    DeliveryLocations: true
                },
                take: 10,
                skip: input.page ? input.page * 10 : 0
            });
            const returnable: CustomerDeliveryLocationsType[] = [];
            (await data).forEach((item) => {
                if (returnable.filter((_item) => _item.CustomerID === item.CustomerID && _item.DeliveryLocationID === item.DeliveryLocationID).length === 0) {
                    returnable.push(item);
                }
            })
            return returnable;
        },
    })
    .mutation('put', {
        // validate input with Zod
        input: CustomerDeliveryLocationsModel.omit({ID: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.customerDeliveryLocations.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: CustomerDeliveryLocationsModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.customerDeliveryLocations.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    })
    .mutation('delete', {
        input: CustomerDeliveryLocationsModel,
        async resolve({ctx, input}) {
            const {CustomerID, DeliveryLocationID} = input;
            // use your ORM of choice
            return await ctx.prisma.customerDeliveryLocations.deleteMany({where: {
                AND: [
                    {CustomerID: CustomerID},
                    {DeliveryLocationID: DeliveryLocationID}
                ]
            }})
        },
    });

