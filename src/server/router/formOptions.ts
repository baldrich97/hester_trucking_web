import {createRouter} from "./context";
import {FormOptionsModel} from "../../../prisma/zod";

export const formOptionsRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.formOptions.findMany({
                include: {Forms: true},
                orderBy: [{Forms: {DisplayName: "asc"}}, {Form: "asc"}],
            });
        },
    })
    .mutation("update", {
        input: FormOptionsModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            return ctx.prisma.formOptions.update({
                where: {ID},
                data,
            });
        },
    });
