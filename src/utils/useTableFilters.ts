import {useCallback, useMemo, useState} from "react";

/**
 * Shared state machine for the search-modal pattern used by Loads, MassEdit,
 * Invoices, and Overdue Invoices tables.
 *
 * Two parallel filter snapshots:
 *   - `draft`   — what the user is typing into the modal. Updated on every
 *                 keystroke / dropdown pick. Survives the modal being dismissed
 *                 (backdrop / Escape / Cancel) so the user can reopen and
 *                 fine-tune without re-entering anything.
 *   - `applied` — the snapshot the table is actually being filtered by. Only
 *                 changes when the user explicitly clicks Apply (or Clear,
 *                 which wipes both back to the empty defaults).
 *
 * Splitting these two pieces of state is what lets the table NOT empty out
 * behind the modal while the user is mid-edit — the data query keys off
 * `applied`, not `draft`.
 *
 * Usage:
 * ```ts
 * const filters = useTableFilters({
 *   customer: 0,
 *   driver: 0,
 *   matchMode: "all" as TableFilterMatchMode,
 *   search: null as number | null,
 * });
 *
 * // bind a modal autocomplete to a draft field:
 * <BasicAutocomplete defaultValue={filters.draft.customer || null}
 *                    onSelect={(id) => filters.updateDraft("customer", id)} />
 *
 * // fire queries off applied:
 * trpc.useQuery(["loads.getAllPage", {...filters.applied, page, orderBy, order}], …);
 *
 * // wire to GenericTable:
 * <GenericTable doSearch={filters.apply} clearFilter={filters.clear}
 *               searchSet={filters.isActive}
 *               matchMode={filters.draft.matchMode as TableFilterMatchMode}
 *               onMatchModeChange={(m) => filters.updateDraft("matchMode", m)} />
 * ```
 */
export function useTableFilters<T extends Record<string, unknown>>(empty: T) {
    const [draft, setDraft] = useState<T>(empty);
    const [applied, setApplied] = useState<T>(empty);
    /** Bumps on apply/clear so GenericTable can reset to page 0. */
    const [revision, setRevision] = useState(0);

    const updateDraft = useCallback(
        <K extends keyof T>(key: K, value: T[K]) => {
            setDraft((prev) => ({...prev, [key]: value}));
        },
        [],
    );

    const apply = useCallback(() => {
        setApplied(draft);
        setRevision((r) => r + 1);
    }, [draft]);

    /**
     * Set both draft AND applied to the same partial values in one step.
     *
     * Use for flows that bypass the modal entirely — e.g. mass-edit's "pick a
     * load" action that auto-populates customer / driver / etc. from the
     * chosen load and should immediately drive the table query.
     */
    const setBoth = useCallback((values: Partial<T>) => {
        setDraft((prev) => ({...prev, ...values}));
        setApplied((prev) => ({...prev, ...values}));
        setRevision((r) => r + 1);
    }, []);

    const clear = useCallback(() => {
        setDraft(empty);
        setApplied(empty);
        setRevision((r) => r + 1);
    }, [empty]);

    /** Reset filters without bumping revision (e.g. switching tabs — new table mounts with SSR data). */
    const resetQuiet = useCallback(() => {
        setDraft(empty);
        setApplied(empty);
    }, [empty]);

    const revertDraft = useCallback(() => {
        setDraft(applied);
    }, [applied]);

    /**
     * `applied` differs from `empty` on at least one key → some filter is
     * currently in effect. This is what drives both the table-header "X"
     * clear chip and the page-level "use fetched rows vs SSR rows" branch.
     */
    const isActive = useMemo(() => {
        for (const k of Object.keys(empty) as Array<keyof T>) {
            if (!Object.is(applied[k], empty[k])) return true;
        }
        return false;
    }, [applied, empty]);

    return {draft, applied, updateDraft, setBoth, apply, clear, resetQuiet, revertDraft, isActive, revision};
}
