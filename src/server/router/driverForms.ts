import {createRouter} from "./context";
import {z} from "zod";
import {DriverFormsModel} from '../../../prisma/zod';

export const driverFormsRouter = createRouter()
    .mutation('put', {
        input: DriverFormsModel.omit({ ID: true, Created: true }),
        async resolve({ctx, input}) {

            return await ctx.prisma.driverForms.create({
                data: input
            })
        },
    })
    .mutation('delete', {
        input: z.object({
            driverId: z.number(),
            formId: z.number(),
        }),
        async resolve({ctx, input}) {
            const {driverId, formId} = input;
            // use your ORM of choice
            return await ctx.prisma.driverForms.deleteMany({where: {Driver: driverId, Form: formId}})
        },
    });

