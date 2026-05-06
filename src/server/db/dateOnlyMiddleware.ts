import type {Prisma} from "@prisma/client";

/**
 * Date-only DB fields must keep the same calendar day regardless of timezone.
 * Normalize all writes to UTC noon on the intended day.
 */
const DATE_ONLY_FIELDS_BY_MODEL: Record<string, Set<string>> = {
    CustomerLoadTypes: new Set(["DateDelivered"]),
    Drivers: new Set(["DOB"]),
    Invoices: new Set(["InvoiceDate"]),
    TrucksDriven: new Set(["DateDriven"]),
    Loads: new Set(["StartDate"]),
    Dailies: new Set(["DateUsed"]),
    DriverForms: new Set(["Expiration"]),
};

function toUtcNoonPreservingLocalCalendar(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0));
}

function normalizeFieldValue(value: unknown): unknown {
    if (value == null) return value;
    if (value instanceof Date) return toUtcNoonPreservingLocalCalendar(value);
    if (typeof value === "string") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return toUtcNoonPreservingLocalCalendar(parsed);
        }
    }
    return value;
}

function normalizeDateOnlyData(model: string | undefined, data: unknown): unknown {
    if (!model || !data || typeof data !== "object") return data;
    const fields = DATE_ONLY_FIELDS_BY_MODEL[model];
    if (!fields) return data;

    if (Array.isArray(data)) {
        return data.map((row) => normalizeDateOnlyData(model, row));
    }

    const row = {...(data as Record<string, unknown>)};
    for (const field of Array.from(fields)) {
        if (!(field in row)) continue;
        const value = row[field];
        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            ("set" in (value as Record<string, unknown>))
        ) {
            const op = {...(value as Record<string, unknown>)};
            op.set = normalizeFieldValue(op.set);
            row[field] = op;
        } else {
            row[field] = normalizeFieldValue(value);
        }
    }
    return row;
}

export function attachDateOnlyMiddleware(prisma: {
    $use: (cb: Prisma.Middleware) => void;
}): void {
    prisma.$use(async (params, next) => {
        switch (params.action) {
            case "create":
            case "update":
            case "upsert":
                if (params.args?.data) {
                    params.args.data = normalizeDateOnlyData(params.model, params.args.data);
                }
                if (params.action === "upsert" && params.args?.create) {
                    params.args.create = normalizeDateOnlyData(params.model, params.args.create);
                }
                if (params.action === "upsert" && params.args?.update) {
                    params.args.update = normalizeDateOnlyData(params.model, params.args.update);
                }
                break;
            case "createMany":
                if (params.args?.data) {
                    params.args.data = normalizeDateOnlyData(params.model, params.args.data);
                }
                break;
            case "updateMany":
                if (params.args?.data) {
                    params.args.data = normalizeDateOnlyData(params.model, params.args.data);
                }
                break;
            default:
                break;
        }
        return next(params);
    });
}

