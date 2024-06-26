import React from "react";
import {Control, Controller} from "react-hook-form";
import Checkbox from "@mui/material/Checkbox";
import FormHelperText from "@mui/material/FormHelperText"
import FormControl from "@mui/material/FormControl"
import FormControlLabel from '@mui/material/FormControlLabel';


const RHCheckbox = ({ name, control, required = false, defaultValue = false, shouldError = false, errorMessage = '', label = name, disabled = false}: {name: string, control: Control<any>, required?: boolean, defaultValue?: boolean, shouldError?: boolean, errorMessage?: string, label?: string, disabled?: boolean}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({ field }) =>  <FormControl fullWidth={true} error={shouldError} size={'small'}>
                <FormControlLabel
                    label={label}
                    control={<Checkbox {...field} checked={field.value} disabled={disabled} />}
                />{shouldError && <FormHelperText>{errorMessage}</FormHelperText>}
            </FormControl>}
        />
    )
}

export default RHCheckbox;
