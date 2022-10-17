import React from "react";
import {Control, Controller} from "react-hook-form";
import Checkbox from "@mui/material/Checkbox";
import FormHelperText from "@mui/material/FormHelperText"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"

const RHCheckbox = ({ name, control, required = false, defaultValue = false, shouldError = false, errorMessage = '', label = name}: {name: string, control: Control<any>, required?: boolean, defaultValue?: boolean, shouldError?: boolean, errorMessage?: string, label?: string}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({ field }) =>  <FormControl fullWidth={true} error={shouldError}>
                <InputLabel id={label + "-label"}>{label}</InputLabel><Checkbox {...field} size={'small'}/>{shouldError && <FormHelperText>{errorMessage}</FormHelperText>}
            </FormControl>}
        />
    )
}

export default RHCheckbox;
