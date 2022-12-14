import {createRouter} from "./context";
import {z} from "zod";
import { CustomerLoadTypesModel } from '../../../prisma/zod';

export const customerLoadTypesRouter = createRouter()
    .query("getAll", {
        input: z.object({
            CustomerID: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.customerLoadTypes.findMany({
                where: {
                    CustomerID: input.CustomerID
                }
            });
        },
    })
    .mutation('put', {
        // validate input with Zod
        input: CustomerLoadTypesModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.customerLoadTypes.create({
                data: input
            })
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: CustomerLoadTypesModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.customerLoadTypes.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

