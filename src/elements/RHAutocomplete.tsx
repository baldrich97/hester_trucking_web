import React, {useEffect, useMemo, useState} from "react";
import {Control, Controller, useWatch} from "react-hook-form";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import {trpc} from "../utils/trpc";

/**
 * React-Hook-Form bound Autocomplete that drives every "picker" dropdown in
 * the app (Customer, LoadType, Driver, Truck, DeliveryLocation, Source).
 *
 * One canonical flow:
 *   1. The typed search text is debounced and sent to `${searchQuery}.search`.
 *   2. The server is the single source of truth for what rows exist (the typed
 *      `search` is the only filter; optional fkeys steer grouping only — see
 *      `server/router/_dropdownSearch.ts`).
 *   3. Each row comes back with a `Group` field. We pass that to MUI's `groupBy`
 *      after mapping it through `groupLabels` for human-readable headers.
 *   4. The currently-selected row (if any) is hydrated from `${searchQuery}.get`
 *      so the input shows a label even when the menu is closed / the row isn't
 *      in the current search hits.
 *
 * Inline "+ New …" creation is supported via `newOptionLabel` + `onNewOptionClick`.
 * After the parent persists the new record and pushes the new ID into the form
 * value, the `${searchQuery}.get` hydration picks the new row up automatically.
 */

/** Routers that expose `.get` with `{ID}` for hydrating the selected-row label. */
const ROUTERS_WITH_GET = new Set([
    "customers",
    "drivers",
    "trucks",
    "loadtypes",
    "deliverylocations",
    "sources",
]);

/** Sentinel `optionValue` used for the synthetic "+ New …" menu row. */
const NEW_OPTION_VALUE = "__create_new_option__";

type Row = Record<string, unknown>;

export type RHAutocompleteProps = {
    name: string;
    control: Control<any>;
    required?: boolean;
    defaultValue?: string | number | null;
    shouldError?: boolean;
    errorMessage?: string;
    label?: string;
    disabled?: boolean;

    /** tRPC router name, e.g. "loadtypes". `.search` and `.get` are both invoked. */
    searchQuery: string;
    /** Field name on each row that holds the unique key (almost always `"ID"`). */
    optionValue: string;
    /**
     * Field-name template for the visible label. A simple field name (e.g.
     * `"Description"`) renders that field's value. Compound labels join multiple
     * fields with `+` and may include literal separators (e.g.
     * `"Name+|+Street+,+City"` renders `Name | Street, City`).
     */
    optionLabel: string;

    /**
     * Optional fkeys forwarded to the server. They never filter the row set —
     * they only determine which mutually-exclusive `Group` each row lands in
     * (see `server/router/_dropdownSearch.ts`).
     */
    selectedCustomer?: number | null;
    selectedSource?: number | null;
    selectedLoadType?: number | null;
    selectedTruck?: number | null;
    selectedDriver?: number | null;

    /** When true (Load form), driver/truck search excludes inactive rows. */
    onlyActive?: boolean;

    /**
     * Map of server `Group` values to display labels for MUI group headers,
     * e.g. `{Customer: "Used by Customer", Source: "Linked to Source", Other: "Other"}`.
     * If omitted (or `enableOptionGroups` is false), the list is rendered flat.
     */
    groupLabels?: Record<string, string>;
    /** Set to false to suppress group headers even when `groupLabels` is provided. */
    enableOptionGroups?: boolean;

    /** Adds a synthetic "+ New …" option at the top of the menu when set. */
    newOptionLabel?: string;
    onNewOptionClick?: () => void;

    /**
     * @deprecated Options are driven by the live `.search` query — this prop is
     * kept only because `GenericForm` still passes it positionally.
     */
    data?: Array<any>;
    /** @deprecated Use `groupLabels` + `Group` on the row. */
    groupBy?: string | null;
    /** @deprecated Use `groupLabels`. */
    groupByNames?: string | null;
};

/**
 * Render a row to a string for the input and menu, given a label template.
 * Supports both single-field names ("Description") and compound templates
 * ("Name+|+Street+,+City").
 */
function renderRowLabel(template: string, row: Row): string {
    const parts = template.split("+");
    if (parts.length === 1) {
        // Single field. Fall back to `Description` when `DisplayName` is empty
        // (e.g. selectedRow from `.get` doesn't carry annotated DisplayName).
        const value = row[template];
        if (value != null && value !== "") return String(value);
        if (template === "DisplayName" && row.Description != null) {
            return String(row.Description);
        }
        return "";
    }
    let out = "";
    parts.forEach((part, i) => {
        out += part in row ? String(row[part] ?? "") : part;
        const next = parts[i + 1];
        if (i + 1 < parts.length && next !== ",") out += " ";
    });
    if (row.Active === false) out += out.length > 0 ? " - INACTIVE" : "- INACTIVE";
    return out;
}

const RHAutocomplete: React.FC<RHAutocompleteProps> = ({
    name,
    control,
    required = false,
    defaultValue = "",
    shouldError = false,
    errorMessage = "",
    label = name,
    disabled = false,
    searchQuery,
    optionValue,
    optionLabel,
    selectedCustomer = 0,
    selectedSource = 0,
    selectedLoadType = 0,
    selectedTruck = 0,
    selectedDriver = 0,
    onlyActive = false,
    groupLabels,
    enableOptionGroups = true,
    newOptionLabel,
    onNewOptionClick,
}) => {
    // --- Form value plumbing -------------------------------------------------
    // We watch the RHF value rather than relying on `field.value` from the
    // Controller render-prop because we need to drive the `.get` hydration
    // query outside the Controller's render.
    const watchedValue = useWatch({control, name});
    const idSource = watchedValue !== undefined ? watchedValue : defaultValue;
    const parsedId = useMemo<number | null>(() => {
        if (idSource == null || idSource === "") return null;
        const n = Number(idSource);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [idSource]);

    // --- Search debounce -----------------------------------------------------
    const [typed, setTyped] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const trimmed = typed.trim();
        if (trimmed.length === 0) {
            setDebouncedSearch("");
            return;
        }
        const t = setTimeout(() => setDebouncedSearch(trimmed), 250);
        return () => clearTimeout(t);
    }, [typed]);

    // --- Menu open state -----------------------------------------------------
    const [menuOpen, setMenuOpen] = useState(false);

    // --- Live `.search` query ------------------------------------------------
    // Only enabled when the menu is open so closed pickers don't pull data.
    const searchInput = useMemo(
        () => ({
            search: debouncedSearch,
            CustomerID: selectedCustomer || undefined,
            SourceID: selectedSource || undefined,
            LoadTypeID: selectedLoadType || undefined,
            TruckID: selectedTruck || undefined,
            DriverID: selectedDriver || undefined,
            onlyActive: onlyActive ? true : undefined,
        }),
        [
            debouncedSearch,
            selectedCustomer,
            selectedSource,
            selectedLoadType,
            selectedTruck,
            selectedDriver,
            onlyActive,
        ],
    );
    const liveSearchEnabled = Boolean(searchQuery) && menuOpen && !disabled;
    // NOTE: deliberately NOT using `keepPreviousData` — when the search text
    // changes we want options to clear immediately rather than briefly show
    // results from the prior query (e.g. typing "Rock" after "1\" Minus"
    // should not show 1" Minus rows while React Query refetches).
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore dynamic procedure path
    const searchResult = trpc.useQuery([`${searchQuery}.search`, searchInput], {
        enabled: liveSearchEnabled,
        staleTime: 0,
    });

    // --- Selected-row hydration ---------------------------------------------
    // Fetches the currently-selected row so the input shows a label when the
    // menu is closed or the row isn't in the current search hits.
    const canUseGet =
        Boolean(searchQuery) && ROUTERS_WITH_GET.has(searchQuery) && !disabled;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore dynamic procedure path
    const selectedRowQuery = trpc.useQuery([`${searchQuery}.get`, {ID: parsedId!}], {
        enabled: canUseGet && parsedId != null,
        staleTime: 60_000,
    });
    const selectedRow = selectedRowQuery.data as Row | undefined;

    // --- Option list construction ------------------------------------------
    // Single defensive dedup-by-`optionValue` pass. Selected row first so the
    // chosen value is always visible even when search filters it out.
    const synthesizedNewOption = useMemo<Row | null>(() => {
        if (!newOptionLabel || !onNewOptionClick) return null;
        return {
            [optionValue]: NEW_OPTION_VALUE,
            [optionLabel]: newOptionLabel,
            __isNewOption: true,
        };
    }, [newOptionLabel, onNewOptionClick, optionValue, optionLabel]);

    // While the menu is loading we have no fresh data — show an empty list
    // (plus "+ New …" if applicable) so users never see options from the
    // previous search bleeding into a new one.
    const isSearchLoading = liveSearchEnabled && searchResult.isFetching;

    const options = useMemo<Row[]>(() => {
        const searchRows = isSearchLoading
            ? []
            : ((searchResult.data as Row[] | undefined) ?? []);
        const seen = new Set<unknown>();
        const out: Row[] = [];

        const push = (row: Row | null | undefined) => {
            if (!row) return;
            const key = row[optionValue];
            if (key == null || seen.has(key)) return;
            seen.add(key);
            out.push(row);
        };

        // "+ New …" pinned to the top of the menu.
        if (synthesizedNewOption) push(synthesizedNewOption);
        // Pin the current selection at the top only when the user isn't actively
        // searching — otherwise it looks like the previous pick is contaminating
        // fresh results. MUI still renders the selected value's label in the
        // input via `getOptionLabel(value)` even when it isn't in `options`.
        if (!debouncedSearch && selectedRow && parsedId != null) {
            push(selectedRow);
        }
        for (const row of searchRows) push(row);

        return out;
    }, [
        searchResult.data,
        isSearchLoading,
        selectedRow,
        parsedId,
        synthesizedNewOption,
        debouncedSearch,
        optionValue,
    ]);

    // --- Bound value object passed to MUI Autocomplete ----------------------
    // Prefer the annotated row from the live search (carries `DisplayName`,
    // `Group`, etc.) so the input label matches the menu. Fall back to the
    // plain `.get` row when the menu's never been opened.
    const value = useMemo<Row | null>(() => {
        if (parsedId == null) return null;
        const fromSearch = options.find((r) => r[optionValue] === parsedId);
        if (fromSearch) return fromSearch;
        if (selectedRow && Number(selectedRow[optionValue]) === parsedId) {
            return selectedRow;
        }
        return null;
    }, [options, parsedId, selectedRow, optionValue]);

    // --- Grouping -----------------------------------------------------------
    const useGrouping = Boolean(
        enableOptionGroups && groupLabels && Object.keys(groupLabels).length > 0,
    );
    const groupByForMui = (option: Row): string => {
        if (option.__isNewOption) return "";
        if (!useGrouping || !groupLabels) return "";
        const raw = option.Group;
        if (typeof raw !== "string") return groupLabels.Other ?? "";
        return groupLabels[raw] ?? groupLabels.Other ?? "";
    };

    // --- Render -------------------------------------------------------------
    const loading = isSearchLoading;

    return (
        <Controller
            name={name}
            control={control}
            rules={{required}}
            defaultValue={defaultValue}
            render={({field}) => (
                <FormControl fullWidth error={shouldError} size="small">
                    <Autocomplete
                        {...field}
                        id={`${label}-autocomplete`}
                        open={menuOpen}
                        onOpen={() => {
                            setMenuOpen(true);
                            if (searchQuery) void searchResult.refetch();
                        }}
                        onClose={() => setMenuOpen(false)}
                        options={options}
                        value={value}
                        loading={loading}
                        disabled={disabled}
                        fullWidth
                        size="small"
                        groupBy={useGrouping ? groupByForMui : undefined}
                        isOptionEqualToValue={(option, v) =>
                            (option as Row)[optionValue] === (v as Row)[optionValue]
                        }
                        getOptionLabel={(option) =>
                            (option as Row).__isNewOption
                                ? String(newOptionLabel ?? "")
                                : renderRowLabel(optionLabel, option as Row)
                        }
                        onChange={(e, row) => {
                            e.preventDefault();
                            const r = row as Row | null;
                            if (r?.__isNewOption) {
                                onNewOptionClick?.();
                                setMenuOpen(false);
                                return;
                            }
                            field.onChange(r ? r[optionValue] ?? null : null);
                            if (r == null) setTyped("");
                        }}
                        onInputChange={(_e, inputValue, reason) => {
                            if (reason === "input") setTyped(inputValue);
                            else if (reason === "clear") setTyped("");
                        }}
                        onKeyDown={(e) => {
                            // Don't let the user submit the surrounding form by pressing Enter
                            // when the dropdown is the focused control.
                            if (e.key === "Enter") e.preventDefault();
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={label}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <React.Fragment>
                                            {loading ? (
                                                <CircularProgress color="inherit" size={20} />
                                            ) : null}
                                            {params.InputProps?.endAdornment}
                                        </React.Fragment>
                                    ),
                                }}
                            />
                        )}
                    />
                    {shouldError && <FormHelperText>{errorMessage}</FormHelperText>}
                </FormControl>
            )}
        />
    );
};

export default RHAutocomplete;
