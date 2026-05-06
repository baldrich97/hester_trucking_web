import React, {useEffect, useMemo, useState} from "react";
import TextField, {TextFieldProps} from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import {trpc} from "../utils/trpc";

const ROUTERS_WITH_GET = new Set([
    "customers",
    "drivers",
    "trucks",
    "loadtypes",
    "deliverylocations",
    "sources",
]);

const BasicAutocomplete = ({
    defaultValue = "",
    label,
    data = [],
    optionLabel,
    optionValue,
    searchQuery,
    onSelect,
}: {
    defaultValue?: string | number | null;
    label: string;
    data?: Array<any>;
    optionLabel: string;
    optionValue: string;
    searchQuery: string;
    onSelect: any;
}) => {
    const formatOptionLabel = (lbl: string, item: any): string => {
        let returnable = "";
        if (lbl.split("+").length > 1) {
            if (defaultValue === 0) {
                return item[lbl.split("+")[0] ?? ""];
            }
            lbl.split("+").forEach((labelPart, index) => {
                if (Object.keys(item).includes(labelPart)) {
                    returnable += item[labelPart] ?? "";
                } else {
                    returnable += labelPart;
                }
                if (
                    index + 1 !== lbl.split("+").length &&
                    lbl.split("+")[index + 1] !== ","
                ) {
                    returnable += " ";
                }
            });
        } else {
            const v = item[lbl];
            if (v != null && v !== "") {
                return v.toString();
            }
            if (lbl === "DisplayName" && item.Description != null) {
                return item.Description.toString();
            }
            return "";
        }
        return returnable;
    };

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [options, setOptions] = useState<readonly any[]>([]);
    const [value, setValue] = useState<any>(null);

    useEffect(() => {
        const trimmed = search.trim();
        if (trimmed.length === 0) {
            setDebouncedSearch("");
            return;
        }
        const t = setTimeout(() => setDebouncedSearch(trimmed), 250);
        return () => clearTimeout(t);
    }, [search]);

    const parsedId = useMemo(() => {
        if (
            defaultValue === null ||
            defaultValue === undefined ||
            defaultValue === ""
        ) {
            return null;
        }
        const n = Number(defaultValue);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [defaultValue]);

    const clientProvidedOptions = Array.isArray(data) && data.length > 0;

    const searchInput = useMemo(() => ({search: debouncedSearch}), [debouncedSearch]);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore dynamic procedure path
    const searchQueryResult = trpc.useQuery([`${searchQuery}.search`, searchInput], {
        enabled: Boolean(searchQuery) && menuOpen && !clientProvidedOptions,
        keepPreviousData: true,
        staleTime: 30_000,
    });

    const canUseGet =
        Boolean(searchQuery) && ROUTERS_WITH_GET.has(searchQuery);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore dynamic procedure path
    const selectedRowQuery = trpc.useQuery([`${searchQuery}.get`, {ID: parsedId!}], {
        enabled: canUseGet && parsedId != null,
        staleTime: 60_000,
    });

    const selectedRow = selectedRowQuery.data;

    useEffect(() => {
        if (clientProvidedOptions) {
            setOptions(data);
            const match = parsedId
                ? data.find((item) => item[optionValue] == parsedId)
                : null;
            if (match) {
                setValue(match);
            }
            return;
        }
        const rows = searchQueryResult.data as any[] | undefined;
        if (!rows) {
            return;
        }
        const merged = [...rows];
        if (
            selectedRow &&
            !merged.some((o) => o[optionValue] === selectedRow[optionValue])
        ) {
            merged.unshift(selectedRow);
        }
        setOptions(merged);
    }, [
        clientProvidedOptions,
        data,
        searchQueryResult.data,
        selectedRow,
        optionValue,
        parsedId,
    ]);

    useEffect(() => {
        if (clientProvidedOptions) {
            return;
        }
        if (!parsedId) {
            setValue(null);
            return;
        }
        if (selectedRow) {
            setValue(selectedRow);
        }
    }, [clientProvidedOptions, parsedId, selectedRow]);

    const loading = menuOpen && !clientProvidedOptions && searchQueryResult.isFetching;

    return (
        <Autocomplete
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            id={label + "-autocomplete"}
            open={menuOpen}
            fullWidth={true}
            onOpen={() => setMenuOpen(true)}
            onClose={() => setMenuOpen(false)}
            isOptionEqualToValue={(option: {[x: string]: any}, v: {[x: string]: any}) => {
                return option[optionValue] === v[optionValue];
            }}
            getOptionLabel={(option: any) => formatOptionLabel(optionLabel, option) || ""}
            options={options}
            loading={loading}
            onChange={(e: any, row: {[x: string]: any} | null) => {
                setValue(row);
                onSelect(row?.[optionValue] ?? 0);
            }}
            value={value}
            onInputChange={(_, inputValue, reason) => {
                if (reason === "input") {
                    setSearch(inputValue);
                } else if (reason === "clear") {
                    setSearch("");
                    if (clientProvidedOptions) {
                        setOptions(data ?? []);
                    }
                    onSelect(0);
                }
            }}
            size={"small"}
            loadingText={"Loading…"}
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
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
        />
    );
};

export default BasicAutocomplete;
