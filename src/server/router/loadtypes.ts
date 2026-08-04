import {createRouter} from "./context";
import {z} from "zod";
import { LoadTypesModel } from '../../../prisma/zod';
import { LoadTypes } from "@prisma/client";
import {isSourcesCutoverActive, NEW_LOAD_TYPE_ID_THRESHOLD} from "../../config/sourcesCutover";

const notDeletedWhere = {OR: [{Deleted: false}, {Deleted: null}]};

function eraIdFilter(era?: "legacy" | "new" | "all") {
    if (!isSourcesCutoverActive()) {
        return {ID: {lt: NEW_LOAD_TYPE_ID_THRESHOLD}};
    }
    if (era === "new") {
        return {ID: {gte: NEW_LOAD_TYPE_ID_THRESHOLD}};
    }
    if (era === "legacy") {
        return {ID: {lt: NEW_LOAD_TYPE_ID_THRESHOLD}};
    }
    return {};
}

function loadTypeIdMatchesEra(
    id: number,
    era?: "legacy" | "new" | "all",
    openJobIDs?: Set<number>,
): boolean {
    if (openJobIDs?.has(id)) {
        return true;
    }
    if (!era || era === "all") {
        return true;
    }
    if (!isSourcesCutoverActive()) {
        return id < NEW_LOAD_TYPE_ID_THRESHOLD;
    }
    if (era === "new") {
        return id >= NEW_LOAD_TYPE_ID_THRESHOLD;
    }
    if (era === "legacy") {
        return id < NEW_LOAD_TYPE_ID_THRESHOLD;
    }
    return true;
}

export const loadTypesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return await ctx.prisma.loadTypes.findMany({
                where: {
                    OR: [
                        {
                            Deleted: false
                        },
                        {
                            Deleted: null
                        }
                    ],
                }
            });
        },
    })
    .query('get', {
        input: z.object({
            ID: z.number()
        }),
        async resolve({ctx, input}) {
            return ctx.prisma.loadTypes.findUnique({
                where: {
                    ID: input.ID
                }
            })

        }
    })
    .query('search', {
        input: z.object({
            search: z.string().optional(),
            page: z.number().optional(),
            CustomerID: z.number().optional(),
            SourceID: z.number().optional(),
            OpenJobLoadTypeIDs: z.array(z.number()).optional(),
            era: z.enum(["legacy", "new", "all"]).optional(),
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
            const openJobIDs = new Set(input.OpenJobLoadTypeIDs ?? []);
            const customerLinkedIDs = new Set<number>();
            if (input.CustomerID) {
                const associated = await ctx.prisma.customerLoadTypes.findMany({
                    where: {CustomerID: input.CustomerID},
                    select: {LoadTypeID: true},
                });
                associated.forEach((item) => customerLinkedIDs.add(item.LoadTypeID));
            }

            const sourceLinkedIDs = new Set<number>();
            if (input.SourceID) {
                const associated = await ctx.prisma.sourceLoadTypes.findMany({
                    where: {SourceID: input.SourceID},
                    select: {LoadTypeID: true},
                });
                associated.forEach((item) => sourceLinkedIDs.add(item.LoadTypeID));
            }

            const {order, orderBy} = input;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj: Record<string, string> = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            const baseWhere = {
                ...notDeletedWhere,
                ...eraIdFilter(input.era),
            };

            // Pull all matching load types (including grouped ones; we'll re-sort below).
            let baseRows: LoadTypes[];
            if (input.search && input.search.length > 0) {
                const formattedSearch = input.search.replace('"', '\"');
                baseRows = await ctx.prisma.loadTypes.findMany({
                    where: {
                        AND: [
                            baseWhere,
                            {
                                OR: [
                                    {Notes: {contains: formattedSearch}},
                                    {Description: {contains: formattedSearch}},
                                ],
                            },
                        ],
                    },
                    take: 100,
                    orderBy: orderObj,
                });
            } else {
                baseRows = await ctx.prisma.loadTypes.findMany({
                    where: baseWhere,
                    take: 100,
                    orderBy: orderObj,
                    skip: input.page ? input.page * 10 : 0,
                });
            }

            // Make sure all customer-linked + source-linked + open-job load types are present
            const baseIDs = new Set(baseRows.map((row) => row.ID));
            const missingIDs = Array.from(customerLinkedIDs)
                .concat(Array.from(sourceLinkedIDs))
                .concat(Array.from(openJobIDs))
                .filter((id) => !baseIDs.has(id))
                .filter((id) => loadTypeIdMatchesEra(id, input.era, openJobIDs));
            if (missingIDs.length > 0) {
                const extras = await ctx.prisma.loadTypes.findMany({
                    where: {
                        AND: [
                            notDeletedWhere,
                            {ID: {in: missingIDs}},
                            eraIdFilter(input.era),
                        ],
                    },
                });
                baseRows = [...baseRows, ...extras];
            }

            // Pull source-link metadata for ranking source-linked rows (UseCount), not display labels.
            const allIDs = baseRows.map((row) => row.ID);
            const sourceLinks = allIDs.length > 0
                ? await ctx.prisma.sourceLoadTypes.findMany({
                    where: {LoadTypeID: {in: allIDs}},
                    include: {Sources: true},
                })
                : [];

            const linksByLoadType = new Map<number, typeof sourceLinks>();
            for (const link of sourceLinks) {
                const list = linksByLoadType.get(link.LoadTypeID) ?? [];
                list.push(link);
                linksByLoadType.set(link.LoadTypeID, list);
            }

            type Annotated = LoadTypes & {
                Recommend: "OpenJob" | "Customer" | "Source" | null;
                UseCount: number;
                DisplayName: string;
            };

            const annotated: Annotated[] = baseRows.map((row) => {
                const links = linksByLoadType.get(row.ID) ?? [];

                let useCount = 0;
                if (input.SourceID) {
                    const match = links.find((l) => l.SourceID === input.SourceID);
                    if (match) {
                        useCount = match.UseCount;
                    }
                }
                if (!useCount && links.length > 0) {
                    const sorted = [...links].sort((a, b) => {
                        if (b.UseCount !== a.UseCount) return b.UseCount - a.UseCount;
                        return a.SourceID - b.SourceID;
                    });
                    useCount = sorted[0]?.UseCount ?? 0;
                }

                let recommend: Annotated["Recommend"] = null;
                if (openJobIDs.has(row.ID)) {
                    recommend = "OpenJob";
                } else if (customerLinkedIDs.has(row.ID)) {
                    recommend = "Customer";
                } else if (sourceLinkedIDs.has(row.ID)) {
                    recommend = "Source";
                }

                return {
                    ...row,
                    Recommend: recommend,
                    UseCount: useCount,
                    DisplayName: row.Description,
                };
            });

            // Sort: OpenJob, Customer, Source, then everything else.
            annotated.sort((a, b) => {
                const rank = (r: Annotated["Recommend"]) =>
                    r === "OpenJob" ? 0 : r === "Customer" ? 1 : r === "Source" ? 2 : 3;
                const ar = rank(a.Recommend);
                const br = rank(b.Recommend);
                if (ar !== br) return ar - br;
                if (a.Recommend === "Source" && b.Recommend === "Source") {
                    if (b.UseCount !== a.UseCount) return b.UseCount - a.UseCount;
                }
                return a.Description.localeCompare(b.Description);
            });

            return annotated
                .filter((row) => loadTypeIdMatchesEra(row.ID, input.era, openJobIDs))
                .slice(0, 100);
        }
    })
    .query("searchPage", {
        input: z.object({
            search: z.string().optional(),
            page: z.number().optional(),
            orderBy: z.string().optional(),
            order: z.string().optional(),
        }),
        async resolve({ctx, input}) {
            const {order, orderBy, page} = input;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const orderObj = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            orderObj[orderBy] = order;

            const where = {
                OR: [{Deleted: false}, {Deleted: null}],
                ...(input.search && input.search.length > 0
                    ? {
                          AND: {
                              OR: [
                                  {Notes: {contains: input.search.replace('"', '\\"')}},
                                  {Description: {contains: input.search.replace('"', '\\"')}},
                              ],
                          },
                      }
                    : {}),
            };

            const [rows, count] = await Promise.all([
                ctx.prisma.loadTypes.findMany({
                    where,
                    take: 10,
                    skip: page ? page * 10 : 0,
                    orderBy: orderObj,
                }),
                ctx.prisma.loadTypes.count({where}),
            ]);

            return {rows, count};
        },
    })
    .mutation('put', {
        // validate input with Zod
        input: LoadTypesModel.omit({ID: true, Deleted: true}),
        async resolve({ctx, input}) {
            if (isSourcesCutoverActive()) {
                const maxId = await ctx.prisma.loadTypes.aggregate({_max: {ID: true}});
                const nextId = Math.max(
                    NEW_LOAD_TYPE_ID_THRESHOLD,
                    (maxId._max.ID ?? 0) + 1,
                );
                return ctx.prisma.loadTypes.create({
                    data: {...input, ID: nextId},
                });
            }
            return ctx.prisma.loadTypes.create({
                data: input,
            });
        },
    })
    .mutation('post', {
        // validate input with Zod
        input: LoadTypesModel,
        async resolve({ctx, input}) {
            const {ID, ...data} = input;
            // use your ORM of choice
            return ctx.prisma.loadTypes.update({
                where: {
                    ID: ID
                }, data: data
            })
        },
    });

