/** Page size for dailies/weeklies not-printed, W2, and operator lists. */
export const PAGINATED_SHEET_PAGE_SIZE = 10;

/** Last page number (1-based) for server-paginated sheet lists. */
export function getPaginatedLastPage(grabCount: number, pageSize = PAGINATED_SHEET_PAGE_SIZE): number {
    if (grabCount <= 0) {
        return 1;
    }
    return Math.ceil(grabCount / pageSize);
}

export function parseGrabCount(warnings?: string[]): number {
    return parseInt(warnings?.[0] ?? "0", 10) || 0;
}

export function formatPaginatedPageLabel(page: number, grabCount: number, pageSize = PAGINATED_SHEET_PAGE_SIZE): string {
    const lastPage = getPaginatedLastPage(grabCount, pageSize);
    return grabCount > 0 ? `Page ${page} of ${lastPage}` : `Page ${page}`;
}
