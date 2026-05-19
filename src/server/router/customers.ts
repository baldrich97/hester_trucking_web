import {createRouter} from "./context";
import {z} from "zod";
import {CustomersModel} from "../../../prisma/zod";
import {Prisma} from "@prisma/client";
import {
    OTHER_GROUP,
    assembleDropdownResults,
    notDeleted,
} from "./_dropdownSearch";

function customerSearchClause(
    trimmed: string,
): Prisma.CustomersWhereInput | undefined {
    if (trimmed.length === 0) return undefined;
    return {
        OR: [
            {Name: {contains: trimmed}},
            {Street: {contains: trimmed}},
            {City: {contains: trimmed}},
            {ZIP: {contains: trimmed}},
            {Email: {contains: trimmed}},
            {Phone: {contains: trimmed}},
            {MainContact: {contains: trimmed}},
            {Notes: {contains: trimmed}},
        ],
    };
}

export const customersRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.customers.findMany({
                where: {
                    OR: [
                        {
                            Deleted: false
                        },
                        {
                            Deleted: null
                        }
                    ],
                },
                take: 10
            });
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
    })
    .query("search", {
        // Dropdown contract — see `_dropdownSearch.ts`. Customers have no fkey
        // relationship, so every row lands in the `Other` group and is capped
        // at `OTHER_GROUP_LIMIT`.
        input: z.object({
            search: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            const trimmed = (input.search ?? "").trim();
            const searchClause = customerSearchClause(trimmed);
            const baseFilters: Prisma.CustomersWhereInput[] = [notDeleted];
            if (searchClause) baseFilters.push(searchClause);
            const where: Prisma.CustomersWhereInput = {AND: baseFilters};

            const rows = await ctx.prisma.customers.findMany({
                where,
                orderBy: {Name: "asc"},
                include: {States: true},
                take: 200,
            });
            return assembleDropdownResults([
                {group: OTHER_GROUP, rows},
            ]);
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
            const {order, orderBy, page} = input;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            const where =
                input.search.length > 0
                    ? {
                          OR: [
                              {Name: {contains: formattedSearch}},
                              {Street: {contains: formattedSearch}},
                              {City: {contains: formattedSearch}},
                              {ZIP: {contains: formattedSearch}},
                              {Email: {contains: formattedSearch}},
                              {Phone: {contains: formattedSearch}},
                              {MainContact: {contains: formattedSearch}},
                              {Notes: {contains: formattedSearch}},
                          ],
                      }
                    : {};

            const [rows, count] = await Promise.all([
                ctx.prisma.customers.findMany({
                    where,
                    orderBy: orderObj,
                    include: {
                        States: {select: {Abbreviation: true}},
                    },
                    take: 10,
                    skip: page ? 10 * page : 0,
                }),
                ctx.prisma.customers.count({where}),
            ]);

            return {rows, count};
        },
    })
    .mutation('put', {
        // validate input with Zod
        input: CustomersModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return ctx.prisma.customers.create({
                data: input
            })
        },
    })
    .mutation('post', {
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

