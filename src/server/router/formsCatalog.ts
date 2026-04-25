import {createRouter} from "./context";
import {z} from "zod";

export const formsCatalogRouter = createRouter().mutation("createWithOptions", {
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
});
