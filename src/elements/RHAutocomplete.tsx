import React, {useEffect, useMemo, useState} from "react";
import {Control, Controller} from "react-hook-form";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import {trpc} from "../utils/trpc";

/** Routers that expose `.get` with `{ ID }` for hydrating the closed-field label. */
const ROUTERS_WITH_GET = new Set([
    "customers",
    "drivers",
    "trucks",
    "loadtypes",
    "deliverylocations",
    "sources",
]);

const RHAutocomplete = ({
    name,
    control,
    required = false,
    defaultValue = "",
    shouldError = false,
    errorMessage = "",
    label = name,
    data = [],
    optionLabel,
    optionValue,
    disabled = false,
    searchQuery,
    groupBy = null,
    groupByNames = null,
    selectedCustomer = 0,
    selectedSource = 0,
    selectedLoadType = 0,
}: {
    name: string;
    control: Control<any>;
    required?: boolean;
    defaultValue?: string | number | null;
    shouldError?: boolean;
    errorMessage?: string;
    label?: string;
    data: Array<any>;
    optionLabel: string;
    optionValue: string;
    disabled?: boolean;
    searchQuery: string;
    groupBy?: string | null;
    groupByNames?: string | null;
    selectedCustomer?: number | null;
    selectedSource?: number | null;
    selectedLoadType?: number | null;
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

    const searchInput = useMemo(
        () => ({
            search: debouncedSearch,
            CustomerID: selectedCustomer || undefined,
            SourceID: selectedSource || undefined,
            LoadTypeID: selectedLoadType || undefined,
        }),
        [debouncedSearch, selectedCustomer, selectedSource, selectedLoadType]
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore dynamic procedure path
    const searchQueryResult = trpc.useQuery([`${searchQuery}.search`, searchInput], {
        enabled:
            Boolean(searchQuery) &&
            menuOpen &&
            !clientProvidedOptions &&
            !disabled,
        keepPreviousData: true,
        staleTime: 30_000,
    });

    const canUseGet =
        Boolean(searchQuery) &&
        ROUTERS_WITH_GET.has(searchQuery) &&
        !disabled;

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

    function groupByFunction(option: {[x: string]: any}) {
        if (!groupBy || !groupByNames) {
            return "";
        }
        const raw = option[groupBy];
        const tokens = groupByNames.split("|");

        const mapEntries = tokens
            .map((t) => {
                const eq = t.indexOf("=");
                if (eq < 0) return null;
                return [t.slice(0, eq), t.slice(eq + 1)] as const;
            })
            .filter((entry): entry is readonly [string, string] => entry !== null);

        if (mapEntries.length > 0) {
            const map = Object.fromEntries(mapEntries);
            if (typeof raw === "string" && raw.length > 0 && map[raw]) {
                return map[raw];
            }
            const fallback = tokens.find((t) => !t.includes("="));
            return fallback ?? "";
        }

        return raw ? tokens[0] ?? "" : tokens[1] ?? "";
    }

    const checkKeyDown = (e: {key: string; preventDefault: () => void}) => {
        if (e.key === "Enter") {
            e.preventDefault();
        }
    };

    return (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({field}) => (
                <FormControl fullWidth={true} error={shouldError} size={"small"}>
                    <Autocomplete
                        {...field}
                        id={label + "-autocomplete"}
                        groupBy={(option) => groupByFunction(option)}
                        open={menuOpen}
                        fullWidth={true}
                        disabled={disabled}
                        onOpen={() => setMenuOpen(true)}
                        onClose={() => setMenuOpen(false)}
                        isOptionEqualToValue={(option, v) => {
                            return option[optionValue] === v[optionValue];
                        }}
                        onKeyPress={(e) => checkKeyDown(e)}
                        getOptionLabel={(option) =>
                            formatOptionLabel(optionLabel, option) || ""
                        }
                        options={options}
                        loading={loading}
                        onChange={(e, row) => {
                            e.preventDefault();
                            if (row === null) {
                                setSearch("");
                            }
                            setValue(row);
                            field.onChange(row ? row[optionValue] : null);
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
                            }
                        }}
                        size={"small"}
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
                                            {params.InputProps.endAdornment}
                                        </React.Fragment>
                                    ),
                                }}
                            />
                        )}
                    />{" "}
                    {shouldError && <FormHelperText>{errorMessage}</FormHelperText>}
                </FormControl>
            )}
        />
    );
};

export default RHAutocomplete;
