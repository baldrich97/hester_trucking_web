import {TRPCError} from "@trpc/server";
import {createRouter} from "./context";
import {z} from "zod";

export const formsCatalogRouter = createRouter()
    .mutation("createWithOptions", {
        input: z.object({
            Name: z.string().min(1),
            DisplayName: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.$transaction(async (tx) => {
                const form = await tx.forms.create({
                    data: {
                        Name: input.Name,
                        DisplayName: input.DisplayName ?? input.Name,
                    },
                });
                await tx.formOptions.create({
                    data: {Form: form.ID},
                });
                return form;
            });
        },
    })
    .mutation("deleteWithOptions", {
        input: z.object({formOptionId: z.number()}),
        async resolve({ctx, input}) {
            return ctx.prisma.$transaction(async (tx) => {
                const option = await tx.formOptions.findUnique({
                    where: {ID: input.formOptionId},
                    include: {Forms: true},
                });
                if (!option) {
                    throw new TRPCError({code: "NOT_FOUND", message: "Form option not found"});
                }
                const formId = option.Form;
                await tx.driverForms.deleteMany({where: {Form: formId}});
                await tx.formOptions.delete({where: {ID: option.ID}});
                await tx.forms.delete({where: {ID: formId}});
                return {formId, displayName: option.Forms.DisplayName};
            });
        },
    });
