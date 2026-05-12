import {createRouter} from "./context";
import {z} from "zod";
import {DriverFormsModel} from '../../../prisma/zod';
import {FormExpiryCadence} from "@prisma/client";

/**
 * `Expiration` in the payload is the date the user picked in the modal.
 * For `EXPIRATION_DATE` cadence that pick is the **expiry**; `Created` must be the filing date (today).
 * For calendar / rolling cadences the pick is the **filed** date; `Expiration` is not used for compliance.
 */
const driverFormPutInput = DriverFormsModel.omit({ID: true, Created: true}).extend({
    /** Local "today" as UTC noon; used when cadence is EXPIRATION_DATE so filing date matches the user. */
    FiledDate: z.coerce.date().nullish(),
});

export const driverFormsRouter = createRouter()
    .mutation('put', {
        input: driverFormPutInput,
        async resolve({ctx, input}) {
            const {FiledDate, ...rest} = input;
            const opt = await ctx.prisma.formOptions.findFirst({
                where: {Form: rest.Form},
                select: {ExpiryCadence: true},
            });
            const cadence = opt?.ExpiryCadence ?? FormExpiryCadence.EXPIRATION_DATE;
            const picked = rest.Expiration ?? null;

            let created: Date;
            let expiration: Date | null;

            if (cadence === FormExpiryCadence.EXPIRATION_DATE) {
                created = FiledDate ?? new Date();
                expiration = picked;
            } else if (cadence === FormExpiryCadence.NONE) {
                created = picked ?? new Date();
                expiration = null;
            } else {
                created = picked ?? new Date();
                expiration = null;
            }

            return await ctx.prisma.driverForms.upsert({
                where: {
                    Driver_Form: {
                        Driver: rest.Driver,
                        Form: rest.Form,
                    },
                },
                create: {
                    ...rest,
                    Expiration: expiration,
                    Created: created,
                    CarrierID: rest.CarrierID ?? null,
                    Filer: rest.Filer?.trim() ? rest.Filer.trim() : null,
                },
                update: {
                    Expiration: expiration,
                    Created: created,
                    CarrierID: rest.CarrierID ?? null,
                    Filer: rest.Filer?.trim() ? rest.Filer.trim() : null,
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

