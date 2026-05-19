import React, {useEffect, useMemo, useState} from "react";
import TextField, {TextFieldProps} from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import {trpc} from "../utils/trpc";

/**
 * Standalone Autocomplete used by filter bars on table pages (Loads / Invoices
 * / WeeklySheet). Shares the dropdown `.search` contract with `RHAutocomplete`
 * (see `server/router/_dropdownSearch.ts`) but exposes a simple `onSelect`
 * callback in lieu of React-Hook-Form integration. No fkeys are passed in,
 * so the server returns a flat `Other` group and grouping is skipped.
 */

const ROUTERS_WITH_GET = new Set([
    "customers",
    "drivers",
    "trucks",
    "loadtypes",
    "deliverylocations",
    "sources",
]);

type Row = Record<string, unknown>;

export type BasicAutocompleteProps = {
    defaultValue?: string | number | null;
    label: string;
    optionValue: string;
    optionLabel: string;
    searchQuery: string;
    onSelect: (idOrZero: number) => void;
    /** @deprecated Options are driven by the live `.search` query. */
    data?: Array<any>;
};

function renderRowLabel(template: string, row: Row): string {
    const parts = template.split("+");
    if (parts.length === 1) {
        const v = row[template];
        if (v != null && v !== "") return String(v);
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
    return out;
}

const BasicAutocomplete: React.FC<BasicAutocompleteProps> = ({
    defaultValue = "",
    label,
    optionValue,
    optionLabel,
    searchQuery,
    onSelect,
}) => {
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

    const parsedId = useMemo<number | null>(() => {
        if (defaultValue == null || defaultValue === "") return null;
        const n = Number(defaultValue);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [defaultValue]);

    const [menuOpen, setMenuOpen] = useState(false);
    const liveSearchEnabled = Boolean(searchQuery) && menuOpen;
    // NOTE: deliberately NOT using `keepPreviousData` — when the search text
    // changes we want options to clear immediately rather than briefly show
    // results from the prior query.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore dynamic procedure path
    const searchResult = trpc.useQuery([`${searchQuery}.search`, {search: debouncedSearch}], {
        enabled: liveSearchEnabled,
        staleTime: 0,
    });

    const canUseGet =
        Boolean(searchQuery) && ROUTERS_WITH_GET.has(searchQuery);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore dynamic procedure path
    const selectedRowQuery = trpc.useQuery([`${searchQuery}.get`, {ID: parsedId!}], {
        enabled: canUseGet && parsedId != null,
        staleTime: 60_000,
    });
    const selectedRow = selectedRowQuery.data as Row | undefined;

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
        // Pin the current selection only when the user isn't actively searching,
        // so old picks don't bleed into fresh results.
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
        debouncedSearch,
        optionValue,
    ]);

    const value = useMemo<Row | null>(() => {
        if (parsedId == null) return null;
        const fromSearch = options.find((r) => r[optionValue] === parsedId);
        if (fromSearch) return fromSearch;
        if (selectedRow && Number(selectedRow[optionValue]) === parsedId) {
            return selectedRow;
        }
        return null;
    }, [options, parsedId, selectedRow, optionValue]);

    const loading = isSearchLoading;

    return (
        <Autocomplete
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
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
            fullWidth
            size="small"
            loadingText="Loading…"
            isOptionEqualToValue={(option, v) =>
                (option as Row)[optionValue] === (v as Row)[optionValue]
            }
            getOptionLabel={(option) => renderRowLabel(optionLabel, option as Row)}
            onChange={(_e, row) => {
                const r = row as Row | null;
                onSelect(r ? Number(r[optionValue]) || 0 : 0);
            }}
            onInputChange={(_e, inputValue, reason) => {
                if (reason === "input") setTyped(inputValue);
                else if (reason === "clear") {
                    setTyped("");
                    onSelect(0);
                }
            }}
            renderInput={(params: JSX.IntrinsicAttributes & TextFieldProps) => (
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
    );
};

export default BasicAutocomplete;
