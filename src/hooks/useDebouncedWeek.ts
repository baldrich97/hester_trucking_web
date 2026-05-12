import * as React from "react";

/**
 * Delays committing `week` to a stable value for server queries (e.g. after rapid chevron clicks).
 * `pending` is true while the UI week has not yet been committed.
 */
export function useDebouncedWeek(week: string, delayMs = 400) {
    const [debouncedWeek, setDebouncedWeek] = React.useState(week);

    React.useEffect(() => {
        const id = window.setTimeout(() => {
            setDebouncedWeek(week);
        }, delayMs);
        return () => window.clearTimeout(id);
    }, [week, delayMs]);

    const pending = week !== debouncedWeek;
    return {debouncedWeek, pending};
}
