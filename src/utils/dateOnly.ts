/**
 * Calendar dates (DOB, hire anniversaries, etc.) must not use midnight UTC —
 * in US timezones that reads as the previous local calendar day and can shift
 * what Prisma/MySQL stores for @db.Date fields.
 *
 * We normalize to **UTC noon** on the intended calendar day so wire + DB stay stable.
 */

export function parseDateOnlyFromJson(input: unknown): Date | null {
    if (input == null || input === "") return null;
    if (input instanceof Date && !Number.isNaN(input.getTime())) {
        return new Date(
            Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 12, 0, 0, 0),
        );
    }
    if (typeof input === "string") {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
        if (m) {
            const y = Number(m[1]);
            const mo = Number(m[2]) - 1;
            const day = Number(m[3]);
            return new Date(Date.UTC(y, mo, day, 12, 0, 0, 0));
        }
        const d = new Date(input);
        if (!Number.isNaN(d.getTime())) {
            return new Date(
                Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0),
            );
        }
        return null;
    }
    return null;
}

/** Use the user's local calendar Y/M/D from a DatePicker value. */
export function dateOnlyLocalToUtcNoon(input: Date | null): Date | null {
    if (!input) return null;
    return new Date(
        Date.UTC(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0, 0),
    );
}

/** Normalize an instant from the DB or tRPC to the same calendar day at UTC noon. */
export function wireDateToUtcNoon(d: Date | null | undefined): Date | null {
    if (d == null) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0));
}
