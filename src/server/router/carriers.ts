import type {Prisma} from "@prisma/client";
import {createRouter} from "./context";
import {z} from "zod";
import {CarriersModel} from "../../../prisma/zod";

function carriersOrderBy(
    orderBy: string | undefined,
    order: string | undefined,
): Prisma.CarriersOrderByWithRelationInput {
    const dir = order === "asc" ? "asc" : "desc";
    switch (orderBy) {
        case "Name":
            return {Name: dir};
        case "ContactName":
            return {ContactName: dir};
        case "Phone":
            return {Phone: dir};
        case "Street":
            return {Street: dir};
        case "City":
            return {City: dir};
        case "ZIP":
            return {ZIP: dir};
        case "States.Abbreviation":
            return {States: {Abbreviation: dir}};
        case "ID":
        default:
            return {ID: dir};
    }
}

export const carriersRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.carriers.findMany({
                orderBy: {Name: "asc"},
                include: {
                    States: {select: {Abbreviation: true}},
                },
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
    .query("searchPage", {
        input: z.object({
            search: z.string(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            const formattedSearch = input.search.replace('"', '\\"');
            const {page} = input;
            const orderByClause = carriersOrderBy(input.orderBy, input.order);

            const where: Prisma.CarriersWhereInput =
                input.search.length > 0
                    ? {
                          OR: [
                              {Name: {contains: formattedSearch}},
                              {ContactName: {contains: formattedSearch}},
                              {Phone: {contains: formattedSearch}},
                              {Street: {contains: formattedSearch}},
                              {City: {contains: formattedSearch}},
                              {ZIP: {contains: formattedSearch}},
                              {
                                  States: {
                                      Abbreviation: {contains: formattedSearch},
                                  },
                              },
                          ],
                      }
                    : {};

            const [rows, count] = await Promise.all([
                ctx.prisma.carriers.findMany({
                    where,
                    orderBy: orderByClause,
                    include: {
                        States: {select: {Abbreviation: true}},
                    },
                    take: 10,
                    skip: page ? page * 10 : 0,
                }),
                ctx.prisma.carriers.count({where}),
            ]);

            return {rows, count};
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
