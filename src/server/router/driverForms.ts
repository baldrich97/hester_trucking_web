import {createRouter} from "./context";
import {z} from "zod";
import {DriverFormsModel} from '../../../prisma/zod';

export const driverFormsRouter = createRouter()
    .mutation('put', {
        input: DriverFormsModel.omit({ ID: true, Created: true }),
        async resolve({ctx, input}) {
            const filingDate = input.Expiration ?? new Date();
            return await ctx.prisma.driverForms.upsert({
                where: {
                    Driver_Form: {
                        Driver: input.Driver,
                        Form: input.Form,
                    },
                },
                create: {
                    ...input,
                    Created: filingDate,
                },
                update: {
                    Expiration: input.Expiration,
                    Created: filingDate,
                },
            });
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

