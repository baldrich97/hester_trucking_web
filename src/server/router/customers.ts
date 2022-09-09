import {createRouter} from "./context";
import {z} from "zod";
import { CustomersModel } from '../../../prisma/zod';

export const customersRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.customers.findMany();
        },
    })
    .query('get', {
        input: z.object({
            ID: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.customers.findUnique({
                where: {
                    ID: input.ID
                }
            })

        }
    }).mutation('put', {
        // validate input with Zod
        input: CustomersModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.customers.create({
                data: input
            })
        },
    }).mutation('post', {
        // validate input with Zod
        input: CustomersModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.customers.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

