import {createRouter} from "./context";
import {z} from "zod";
import {CarriersModel} from "../../../prisma/zod";

export const carriersRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.carriers.findMany({
                orderBy: {Name: "asc"},
            });
        },
    })
    .query("getOne", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            return ctx.prisma.carriers.findUnique({
                where: {ID: input.ID},
                include: {
                    States: true,
                    Drivers: {
                        select: {
                            ID: true,
                            FirstName: true,
                            LastName: true,
                            OwnerOperator: true,
                        },
                        orderBy: {LastName: "asc"},
                    },
                },
            });
        },
    })
    .mutation("put", {
        input: CarriersModel.omit({ID: true}),
        async resolve({ctx, input}) {
            return ctx.prisma.carriers.create({data: input});
        },
    })
    .mutation("post", {
        input: CarriersModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            return ctx.prisma.carriers.update({
                where: {ID},
                data,
            });
        },
    })
    .mutation("delete", {
        input: z.object({ID: z.number()}),
        async resolve({ctx, input}) {
            // Carrier-scoped filings are for the OO entity, not individually "owned" by the driver row.
            // Removing the carrier removes those filings; OO drivers re-file under solo / a new carrier as needed.
            await ctx.prisma.driverForms.deleteMany({
                where: {
                    CarrierID: input.ID,
                    Drivers: {OwnerOperator: true},
                },
            });
            await ctx.prisma.drivers.updateMany({
                where: {CarrierID: input.ID},
                data: {CarrierID: null},
            });
            return ctx.prisma.carriers.delete({where: {ID: input.ID}});
        },
    });
