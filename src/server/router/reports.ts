import {createRouter} from "./context";
import {z} from "zod";
import {TRPCError} from "@trpc/server";
import {isSourcesCutoverActive} from "../../config/sourcesCutover";
import {formatMaterial} from "../../utils/formatMaterial";

const sourceAuditInput = z.object({
    sourceId: z.number(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
});
const customerAuditInput = z.object({
    customerId: z.number(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
});

type AuditRow = {
    ID: number;
    StartDate: Date;
    TicketNumber: number;
    Weight: number;
    TotalAmount: number;
    TotalRate: number;
    MaterialRate: number;
    TruckRate: number;
    DriverRate: number;
    LoadTypeID: number | null;
    LoadType: string;
    Source: string;
    CustomerID: number;
    Customer: string;
    DeliveryLocationID: number | null;
    DeliveryLocation: string;
};

export const reportsRouter = createRouter()
    .query("sourceAudit", {
        input: sourceAuditInput,
        async resolve({ctx, input}) {
            if (!isSourcesCutoverActive()) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Source reports are not available until the Sources cutover.",
                });
            }

            const prismaAny = ctx.prisma as any;
            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            if (startDate > endDate) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Start date cannot be after end date.",
                });
            }

            const source = await prismaAny.sources.findUnique({
                where: {ID: input.sourceId},
                select: {ID: true, Name: true, ShortName: true},
            });

            if (!source) {
                return {
                    source: null,
                    rows: [],
                    summary: {
                        totalLoads: 0,
                        totalTonnage: 0,
                        totalAmount: 0,
                        byLoadType: [],
                    },
                };
            }

            const loads = await ctx.prisma.loads.findMany({
                where: {
                    OR: [{Deleted: false}, {Deleted: null}],
                    StartDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                    SourceID: input.sourceId,
                },
                include: {
                    Customers: {select: {ID: true, Name: true}},
                    LoadTypes: {select: {ID: true, Description: true}},
                    DeliveryLocations: {select: {ID: true, Description: true}},
                    Sources: {select: {Name: true, ShortName: true}},
                },
                orderBy: [{StartDate: "asc"}, {ID: "asc"}],
            });

            const rows: AuditRow[] = loads.map((load) => ({
                ID: load.ID,
                StartDate: load.StartDate,
                TicketNumber: load.TicketNumber,
                Weight: load.Weight ?? 0,
                TotalAmount: load.TotalAmount ?? 0,
                TotalRate: load.TotalRate ?? 0,
                MaterialRate: load.MaterialRate ?? 0,
                TruckRate: load.TruckRate ?? 0,
                DriverRate: load.DriverRate ?? 0,
                LoadTypeID: load.LoadTypeID ?? null,
                LoadType: formatMaterial({
                    description: load.LoadTypes?.Description,
                    source: load.Sources,
                }),
                Source: load.Sources?.ShortName || load.Sources?.Name || "",
                CustomerID: load.Customers.ID,
                Customer: load.Customers.Name,
                DeliveryLocationID: load.DeliveryLocationID ?? null,
                DeliveryLocation: load.DeliveryLocations?.Description ?? "Unknown",
            }));

            const grouped = new Map<string, {loadType: string; totalLoads: number; totalTonnage: number; totalAmount: number}>();

            for (const row of rows) {
                const key = row.LoadType;
                const current = grouped.get(key) ?? {
                    loadType: key,
                    totalLoads: 0,
                    totalTonnage: 0,
                    totalAmount: 0,
                };
                current.totalLoads += 1;
                current.totalTonnage += row.Weight;
                current.totalAmount += row.TotalAmount;
                grouped.set(key, current);
            }

            return {
                source,
                rows,
                summary: {
                    totalLoads: rows.length,
                    totalTonnage: rows.reduce((acc, row) => acc + row.Weight, 0),
                    totalAmount: rows.reduce((acc, row) => acc + row.TotalAmount, 0),
                    byLoadType: Array.from(grouped.values()).sort((a, b) =>
                        a.loadType.localeCompare(b.loadType),
                    ),
                },
            };
        },
    })
    .query("customerAudit", {
        input: customerAuditInput,
        async resolve({ctx, input}) {
            if (!isSourcesCutoverActive()) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Customer source reports are not available until the Sources cutover.",
                });
            }

            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            if (startDate > endDate) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Start date cannot be after end date.",
                });
            }

            const customer = await ctx.prisma.customers.findUnique({
                where: {ID: input.customerId},
                select: {ID: true, Name: true},
            });

            if (!customer) {
                return {
                    customer: null,
                    rows: [],
                    summary: {
                        totalLoads: 0,
                        totalTonnage: 0,
                        totalAmount: 0,
                        byLoadType: [],
                    },
                };
            }

            const loads = await ctx.prisma.loads.findMany({
                where: {
                    OR: [{Deleted: false}, {Deleted: null}],
                    CustomerID: input.customerId,
                    StartDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                include: {
                    Customers: {select: {ID: true, Name: true}},
                    LoadTypes: {select: {ID: true, Description: true}},
                    DeliveryLocations: {select: {ID: true, Description: true}},
                    Sources: {select: {Name: true, ShortName: true}},
                },
                orderBy: [{StartDate: "asc"}, {ID: "asc"}],
            });

            const rows: AuditRow[] = loads.map((load) => ({
                ID: load.ID,
                StartDate: load.StartDate,
                TicketNumber: load.TicketNumber,
                Weight: load.Weight ?? 0,
                TotalAmount: load.TotalAmount ?? 0,
                TotalRate: load.TotalRate ?? 0,
                MaterialRate: load.MaterialRate ?? 0,
                TruckRate: load.TruckRate ?? 0,
                DriverRate: load.DriverRate ?? 0,
                LoadTypeID: load.LoadTypeID ?? null,
                LoadType: formatMaterial({
                    description: load.LoadTypes?.Description,
                    source: load.Sources,
                }),
                Source: load.Sources?.ShortName || load.Sources?.Name || "",
                CustomerID: load.Customers.ID,
                Customer: load.Customers.Name,
                DeliveryLocationID: load.DeliveryLocationID ?? null,
                DeliveryLocation: load.DeliveryLocations?.Description ?? "Unknown",
            }));

            const grouped = new Map<string, {loadType: string; totalLoads: number; totalTonnage: number; totalAmount: number}>();

            for (const row of rows) {
                const key = row.LoadType;
                const current = grouped.get(key) ?? {
                    loadType: key,
                    totalLoads: 0,
                    totalTonnage: 0,
                    totalAmount: 0,
                };
                current.totalLoads += 1;
                current.totalTonnage += row.Weight;
                current.totalAmount += row.TotalAmount;
                grouped.set(key, current);
            }

            return {
                customer,
                rows,
                summary: {
                    totalLoads: rows.length,
                    totalTonnage: rows.reduce((acc, row) => acc + row.Weight, 0),
                    totalAmount: rows.reduce((acc, row) => acc + row.TotalAmount, 0),
                    byLoadType: Array.from(grouped.values()).sort((a, b) =>
                        a.loadType.localeCompare(b.loadType),
                    ),
                },
            };
        },
    });
