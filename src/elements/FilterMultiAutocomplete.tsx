import React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ClearIcon from "@mui/icons-material/Clear";
import type {SxProps, Theme} from "@mui/material/styles";

export type FilterMultiAutocompleteProps<T> = {
    label: string;
    options: T[];
    value: T[];
    onChange: (value: T[]) => void;
    getOptionLabel: (option: T) => string;
    isOptionEqualToValue?: (option: T, value: T) => boolean;
    placeholder?: string;
    sx?: SxProps<Theme>;
    limitTags?: number;
};

/**
 * Searchable multi-select for filter toolbars. Chips show a per-item remove (x);
 * a separate clear-all control sits to the right when any items are selected.
 * Does not replace RHSelect / RHAutocomplete single-value form fields.
 */
export default function FilterMultiAutocomplete<T>({
    label,
    options,
    value,
    onChange,
    getOptionLabel,
    isOptionEqualToValue,
    placeholder,
    sx,
    limitTags = -1,
}: FilterMultiAutocompleteProps<T>) {
    return (
        <Box sx={{display: "flex", alignItems: "flex-start", gap: 0.5, minWidth: 280, flex: "1 1 320px", maxWidth: 520, ...sx}}>
            <Autocomplete
                multiple
                disableCloseOnSelect
                filterSelectedOptions
                size="small"
                options={options}
                value={value}
                onChange={(_, newValue) => onChange(newValue)}
                getOptionLabel={getOptionLabel}
                isOptionEqualToValue={isOptionEqualToValue}
                limitTags={limitTags}
                sx={{flex: 1, minWidth: 0}}
                renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => {
                        const {key, ...tagProps} = getTagProps({index});
                        return (
                            <Chip
                                key={key}
                                label={getOptionLabel(option)}
                                size="small"
                                {...tagProps}
                            />
                        );
                    })
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={label}
                        placeholder={value.length === 0 ? placeholder : undefined}
                    />
                )}
            />
            {value.length > 0 ? (
                <IconButton
                    aria-label="Clear all"
                    size="small"
                    onClick={() => onChange([])}
                    sx={{mt: 0.25, flexShrink: 0}}
                >
                    <ClearIcon fontSize="medium" />
                </IconButton>
            ) : null}
        </Box>
    );
}
