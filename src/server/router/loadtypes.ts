import {createRouter} from "./context";
import {z} from "zod";
import { LoadTypesModel } from '../../../prisma/zod';
import { LoadTypes } from "@prisma/client";

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
            orderBy: z.string().optional(),
            order: z.string().optional()
        }),
        async resolve({ctx, input}) {
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

            // Pull all matching load types (including grouped ones; we'll re-sort below).
            let baseRows: LoadTypes[];
            if (input.search && input.search.length > 0) {
                const formattedSearch = input.search.replace('"', '\"');
                baseRows = await ctx.prisma.loadTypes.findMany({
                    where: {
                        OR: [
                            {Notes: {contains: formattedSearch}},
                            {Description: {contains: formattedSearch}},
                        ],
                    },
                    take: 100,
                    orderBy: orderObj,
                });
            } else {
                baseRows = await ctx.prisma.loadTypes.findMany({
                    take: 100,
                    orderBy: orderObj,
                    skip: input.page ? input.page * 10 : 0,
                });
            }

            // Make sure all customer-linked + source-linked load types are present even if they
            // fell outside the page window above.
            const baseIDs = new Set(baseRows.map((row) => row.ID));
            const missingIDs = Array.from(customerLinkedIDs)
                .concat(Array.from(sourceLinkedIDs))
                .filter((id) => !baseIDs.has(id));
            if (missingIDs.length > 0) {
                const extras = await ctx.prisma.loadTypes.findMany({
                    where: {ID: {in: missingIDs}},
                });
                baseRows = [...baseRows, ...extras];
            }

            // Pull source-link metadata for every returned row to compute UseCount + DisplayName.
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
                Recommend: "Customer" | "Source" | null;
                UseCount: number;
                DisplayName: string;
            };

            const annotated: Annotated[] = baseRows.map((row) => {
                const links = linksByLoadType.get(row.ID) ?? [];

                // Pick the annotation source: explicit SourceID first, otherwise the highest-UseCount link.
                let annotationSource: (typeof links)[number]["Sources"] | null = null;
                let useCount = 0;
                if (input.SourceID) {
                    const match = links.find((l) => l.SourceID === input.SourceID);
                    if (match) {
                        annotationSource = match.Sources;
                        useCount = match.UseCount;
                    }
                }
                if (!annotationSource && links.length > 0) {
                    const sorted = [...links].sort((a, b) => {
                        if (b.UseCount !== a.UseCount) return b.UseCount - a.UseCount;
                        return a.SourceID - b.SourceID;
                    });
                    annotationSource = sorted[0]?.Sources ?? null;
                    if (!useCount) useCount = sorted[0]?.UseCount ?? 0;
                }

                const shortName = annotationSource
                    ? (annotationSource.ShortName && annotationSource.ShortName.length > 0
                        ? annotationSource.ShortName
                        : annotationSource.Name)
                    : null;
                const displayName = shortName ? `${row.Description} (${shortName})` : row.Description;

                let recommend: Annotated["Recommend"] = null;
                if (customerLinkedIDs.has(row.ID)) {
                    recommend = "Customer";
                } else if (sourceLinkedIDs.has(row.ID)) {
                    recommend = "Source";
                }

                return {
                    ...row,
                    Recommend: recommend,
                    UseCount: useCount,
                    DisplayName: displayName,
                };
            });

            // Sort: Customer-grouped first, then Source-grouped (by UseCount desc), then everything else (by Description asc).
            annotated.sort((a, b) => {
                const rank = (r: Annotated["Recommend"]) => (r === "Customer" ? 0 : r === "Source" ? 1 : 2);
                const ar = rank(a.Recommend);
                const br = rank(b.Recommend);
                if (ar !== br) return ar - br;
                if (a.Recommend === "Source" && b.Recommend === "Source") {
                    if (b.UseCount !== a.UseCount) return b.UseCount - a.UseCount;
                }
                return a.Description.localeCompare(b.Description);
            });

            return annotated.slice(0, 100);
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
            // use your ORM of choice
            return ctx.prisma.loadTypes.create({
                data: input
            })
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

