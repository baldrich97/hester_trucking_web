import {createRouter} from "./context";
import {z} from "zod";
import { CustomerLoadTypesModel } from '../../../prisma/zod';

type CustomerLoadTypesType = z.infer<typeof CustomerLoadTypesModel>;

export const customerLoadTypesRouter = createRouter()
    .query("getAll", {
        input: z.object({
            CustomerID: z.number(),
            page: z.number().optional()
        }),
        async resolve({ctx, input}) {
            const data = ctx.prisma.customerLoadTypes.findMany({
                where: {
                    CustomerID: input.CustomerID
                },
                include: {
                    LoadTypes: true
                },
                take: 10,
                skip: input.page ? input.page*10 : 0
            });
            const returnable: CustomerLoadTypesType[] = [];
            (await data).forEach((item) => {
                if (returnable.filter((_item) => _item.CustomerID === item.CustomerID && _item.LoadTypeID === item.LoadTypeID).length === 0) {
                    returnable.push(item);
                }
            })
            return returnable;
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
    })
    .mutation('delete', {
        input: CustomerLoadTypesModel.omit({DateDelivered: true}),
        async resolve({ctx, input}) {
            const {CustomerID, LoadTypeID} = input;
            // use your ORM of choice
            return await ctx.prisma.customerLoadTypes.deleteMany({where: {
                AND: [
                    {CustomerID: CustomerID},
                    {LoadTypeID: LoadTypeID}
                ]
            }})
        },
    });

