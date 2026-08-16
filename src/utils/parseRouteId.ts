/** Parse a Next.js `[id]` param. Prisma rejects `NaN`/`undefined` as "Argument ID is missing". */
export function parseRouteId(id: unknown): number | null {
    if (typeof id === "number") {
        if (!Number.isSafeInteger(id) || id <= 0) {
            return null;
        }
        return id;
    }
    if (typeof id !== "string" || !/^[0-9]+$/.test(id)) {
        return null;
    }
    const parsed = Number(id);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

/** Build `/entity/123` from a table `navigateTo` (`/loads/` or `customers/[ID]`). */
export function entityNavHref(navigateTo: string | undefined, id: unknown): string | null {
    if (!navigateTo) {
        return null;
    }
    const parsed = parseRouteId(id);
    if (parsed == null) {
        return null;
    }
    if (navigateTo.includes("[ID]")) {
        return navigateTo.replace("[ID]", String(parsed));
    }
    return `${navigateTo}${parsed}`;
}

const INVALID_ID_PATH = /\/(undefined|NaN|null)(?:\/|\?|#|$)/;

export function hrefHasInvalidId(href: string | {pathname?: string | null}): boolean {
    const path = typeof href === "string" ? href : href.pathname ?? "";
    return INVALID_ID_PATH.test(path);
}
