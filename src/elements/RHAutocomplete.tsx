import React, {useEffect, useMemo, useState} from "react";
import {Control, Controller, useWatch} from "react-hook-form";
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
    /** Load form: paired FK for driver/truck search grouping (`drivers.search` / `trucks.search`). */
    selectedTruck = 0,
    selectedDriver = 0,
    enableOptionGroups = true,
    newOptionLabel = "",
    onNewOptionClick,
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
    selectedTruck?: number | null;
    selectedDriver?: number | null;
    enableOptionGroups?: boolean;
    newOptionLabel?: string;
    onNewOptionClick?: () => void;
}) => {
    const NEW_OPTION_VALUE = "__create_new_option__";

    /** Live RHF value; parent `defaultValue` does not update on each pick (e.g. Load `inlineDefaultIds`). */
    const watchedValue = useWatch({control, name});
    const idSource = watchedValue !== undefined ? watchedValue : defaultValue;

    const formatOptionLabel = (lbl: string, item: any): string => {
        let returnable = "";
        if (lbl.split("+").length > 1) {
            if (idSource === 0) {
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
        if (idSource === null || idSource === undefined || idSource === "") {
            return null;
        }
        const n = Number(idSource);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [idSource]);

    const clientProvidedOptions = Array.isArray(data) && data.length > 0;
    const shouldShowNewOption = Boolean(newOptionLabel && onNewOptionClick);
    const useOptionGrouping = Boolean(groupBy && groupByNames && enableOptionGroups);

    const withNewOption = React.useCallback(
        (rows: readonly any[]) => {
            if (!shouldShowNewOption) {
                return rows;
            }
            return [
                {[optionValue]: NEW_OPTION_VALUE, [optionLabel]: newOptionLabel, __isNewOption: true},
                ...rows,
            ];
        },
        [shouldShowNewOption, optionLabel, optionValue, newOptionLabel],
    );

    const searchInput = useMemo(
        () => ({
            search: debouncedSearch,
            CustomerID: selectedCustomer || undefined,
            SourceID: selectedSource || undefined,
            LoadTypeID: selectedLoadType || undefined,
            TruckID: selectedTruck || undefined,
            DriverID: selectedDriver || undefined,
        }),
        [
            debouncedSearch,
            selectedCustomer,
            selectedSource,
            selectedLoadType,
            selectedTruck,
            selectedDriver,
        ]
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
            // Merge `.get` row when the selected ID is not in client `data` yet (e.g. inline create).
            const mergedData = [...data];
            if (
                parsedId &&
                selectedRow &&
                !mergedData.some(
                    (o) =>
                        (o as Record<string, unknown>)[optionValue] ===
                        (selectedRow as Record<string, unknown>)[optionValue],
                )
            ) {
                mergedData.unshift(selectedRow);
            }
            setOptions(withNewOption(mergedData));
            const match = parsedId
                ? mergedData.find((item) => item[optionValue] == parsedId)
                : null;
            if (match) {
                setValue(match);
            } else if (!parsedId) {
                setValue(null);
            }
            return;
        }

        const rows = searchQueryResult.data as any[] | undefined;
        if (!rows) {
            if (shouldShowNewOption) {
                setOptions(withNewOption([]));
            }
            return;
        }
        const merged = [...rows];
        if (
            selectedRow &&
            !merged.some(
                (o) =>
                    (o as Record<string, unknown>)[optionValue] ===
                    (selectedRow as Record<string, unknown>)[optionValue],
            )
        ) {
            merged.unshift(selectedRow);
        }
        setOptions(withNewOption(merged));
    }, [
        clientProvidedOptions,
        data,
        searchQueryResult.data,
        selectedRow,
        optionValue,
        parsedId,
        shouldShowNewOption,
        withNewOption,
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

    function groupByFunction(option: {[x: string]: any}): string {
        // Keep "New …" in its own group without custom `renderGroup` (MUI default = full-row hit target + spacing).
        if (option?.__isNewOption) {
            return "";
        }
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
                return String(map[raw] ?? "");
            }
            const fallback = tokens.find((t) => !t.includes("="));
            return fallback ?? "";
        }

        // Two-bucket groups from boolean `Recommend` (drivers/trucks/delivery locations): inclusive | exclusive.
        const inclusive = tokens[0] ?? "";
        const exclusive = tokens[1] ?? inclusive;
        if (raw === true) {
            return inclusive;
        }
        return exclusive;
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
                        groupBy={
                            useOptionGrouping
                                ? (option): string => groupByFunction(option)
                                : undefined
                        }
                        open={menuOpen}
                        fullWidth={true}
                        disabled={disabled}
                        onOpen={() => setMenuOpen(true)}
                        onClose={() => setMenuOpen(false)}
                        isOptionEqualToValue={(option, v) => {
                            return (
                                (option as Record<string, unknown>)[optionValue] ===
                                (v as Record<string, unknown>)[optionValue]
                            );
                        }}
                        onKeyPress={(e) => checkKeyDown(e)}
                        getOptionLabel={(option): string =>
                            // "New ..." meta-option is synthesized, keep label simple.
                            (option?.__isNewOption
                                ? String(newOptionLabel)
                                :
                            String(formatOptionLabel(optionLabel, option) ?? "")
                            )
                        }
                        options={options}
                        loading={loading}
                        onChange={(e, row) => {
                            e.preventDefault();
                            if (row?.__isNewOption) {
                                onNewOptionClick?.();
                                setMenuOpen(false);
                                return;
                            }
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
                                    setOptions(withNewOption(data ?? []));
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
                                            {params.InputProps?.endAdornment}
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
