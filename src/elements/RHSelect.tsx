import React from "react";
import {Control, Controller} from "react-hook-form";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem"
import FormHelperText from "@mui/material/FormHelperText"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"

const RHSelect = ({ name, control, required = false, defaultValue = '', shouldError = false, errorMessage = '', label = name, data = [], optionLabel, optionValue}: {name: string, control: Control<any>, required?: boolean, defaultValue?: string | number, shouldError?: boolean, errorMessage?: string, label?: string, data: Array<any>, optionLabel: string, optionValue: string}) => {

    const formatOptionLabel = (optionLabel: string, item: any): string => {
        let returnable = '';
        if (optionLabel.split('+').length > 1) {
            if (defaultValue === 0) {
                return item[optionLabel.split('+')[0] ?? '']
            }
            optionLabel.split('+').forEach((labelPart, index) => {
                if (Object.keys(item).includes(labelPart)) {
                    returnable += item[labelPart] ?? '';
                } else {
                    returnable += labelPart;
                }
                if (index + 1 !== optionLabel.split('+').length && optionLabel.split('+')[index + 1] !== ',') {
                    returnable += ' ';
                }
            })
        } else {
            return item[optionLabel].toString();
        }
        return returnable;
    }

    return (

            <Controller
                name={name}
                control={control}
                rules={{required: required}}
                defaultValue={defaultValue}
                render={({ field }) => <FormControl fullWidth={true} error={shouldError} size={'small'}>
                    <InputLabel id={label + "-label"}>{label}</InputLabel><Select {...field} label={label}>{data.map((item, key) => {return <MenuItem key={name + 'SelectOption-' + (key + Math.random()).toString()} value={item[optionValue]}>{formatOptionLabel(optionLabel, item)}</MenuItem>})}</Select>  {shouldError && <FormHelperText>{errorMessage}</FormHelperText>}
                </FormControl>}
            />

    )
}

export default RHSelect;
