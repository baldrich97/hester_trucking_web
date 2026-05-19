/**
 * Shared contract for every `*.search` tRPC endpoint that powers an Autocomplete
 * dropdown in the app (e.g. the Load form's LoadType / Driver / Truck / etc.
 * pickers).
 *
 * The rules are simple and apply to every dropdown endpoint:
 *
 *  1. The typed `search` text is the ONLY filter on the row set. Whatever the
 *     user types is matched against the model's searchable columns.
 *  2. Optional foreign-key inputs (CustomerID, SourceID, TruckID, DriverID,
 *     LoadTypeID, …) do NOT narrow the result set. They are only used to assign
 *     each matching row to a mutually exclusive group (see `Group` field on the
 *     returned row).
 *  3. The result is sorted so the more specific / recommended groups come first
 *     and the `Other` group is last.
 *  4. The `Other` group is capped at `OTHER_GROUP_LIMIT` so a broad search does
 *     not return thousands of rows. Recommended groups are NOT capped — if you
 *     selected a customer with hundreds of linked load types, you can scroll
 *     through all of them.
 *  5. Every row appears exactly once. Mutually-exclusive grouping + dedup-by-ID
 *     guarantee no duplicates.
 *
 * Table index pages (drivers / trucks / etc.) DO NOT call `.search`; they call
 * `.searchPage`, which is a different paginated endpoint. Changing the shape of
 * `.search` therefore cannot regress the tables.
 */

/** The default group name for rows that don't match any recommended group. */
export const OTHER_GROUP = "Other";

/** Max rows the `Other` group ever returns from a dropdown `.search`. */
export const OTHER_GROUP_LIMIT = 50;

/**
 * Max rows the search hits scan before grouping. Recommended-group rows that
 * fall outside this window are recovered by a separate "linked-only" query in
 * each router that needs it. Keeping this bounded prevents broad searches
 * (e.g. one-letter input) from pulling huge result sets.
 */
export const SEARCH_SCAN_LIMIT = 200;

/**
 * Annotate / sort / cap a set of matching rows for a dropdown response.
 *
 * Callers pass an ordered list of group "buckets". Each bucket has:
 *   - `group`: the group key written onto every row that lands in it.
 *   - `rows`: the rows that belong in this bucket (already filtered).
 *   - `decorate` (optional): augment a row before grouping (e.g. attach
 *     `DisplayName`, `UseCount`).
 *
 * Earlier buckets win for dedup — if a row appears in two buckets only the
 * first one is kept. The final array is ordered by bucket order, with `Other`
 * truncated to `OTHER_GROUP_LIMIT` (override via `otherLimit`).
 */
export function assembleDropdownResults<T extends {ID: number}, U = T>(
    buckets: Array<{
        group: string;
        rows: T[];
        decorate?: (row: T) => U;
    }>,
    options: {otherLimit?: number} = {},
): Array<U & {Group: string}> {
    const otherLimit = options.otherLimit ?? OTHER_GROUP_LIMIT;
    const seen = new Set<number>();
    const result: Array<U & {Group: string}> = [];

    for (const bucket of buckets) {
        let otherTaken = 0;
        for (const row of bucket.rows) {
            if (seen.has(row.ID)) continue;
            if (bucket.group === OTHER_GROUP && otherTaken >= otherLimit) break;
            seen.add(row.ID);
            const decorated = (bucket.decorate ? bucket.decorate(row) : row) as U;
            result.push({...decorated, Group: bucket.group});
            if (bucket.group === OTHER_GROUP) otherTaken += 1;
        }
    }

    return result;
}

/** Standard "not soft-deleted" filter — every dropdown excludes soft-deleted rows. */
export const notDeleted = {OR: [{Deleted: false}, {Deleted: null}]};
