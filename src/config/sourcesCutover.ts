/** Sunday Aug 2, 2026 00:00 America/Chicago — Sources / clean LoadTypes cutover. */
export const SOURCES_CUTOVER_DATE_DEFAULT = '2026-08-02T00:00:00-05:00';

/** LoadTypes with ID >= this are the post-cutover clean catalog. */
export const NEW_LOAD_TYPE_ID_THRESHOLD = 10000;

/** Open legacy jobs with no ticket in this window are hidden from the load form picker. */
export const OPEN_LEGACY_JOBS_MAX_AGE_DAYS = 365;

export function getSourcesCutoverDate(): Date {
    const raw = process.env.SOURCES_CUTOVER_DATE ?? SOURCES_CUTOVER_DATE_DEFAULT;
    return new Date(raw);
}

/** All customer-visible cutover behavior is off until this returns true. */
export function isSourcesCutoverActive(now: Date = new Date()): boolean {
    if (process.env.SOURCES_CUTOVER_FORCE === 'true') return true;
    return now >= getSourcesCutoverDate();
}

export function isNewEraLoadTypeId(loadTypeId: number | null | undefined): boolean {
    return loadTypeId != null && loadTypeId >= NEW_LOAD_TYPE_ID_THRESHOLD;
}
