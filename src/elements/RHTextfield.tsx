import React from "react";
import {Control, Controller} from "react-hook-form";
import TextField from "@mui/material/TextField";

const RHTextfield = ({ name, control, required = false, defaultValue = '', shouldError = false, errorMessage = '', label = name, multiline = false, type = 'text', disabled = false}: {name: string, control: Control<any>, required?: boolean, defaultValue?: string, shouldError?: boolean, errorMessage?: string, label?: string, multiline?: boolean, maxRows?: number, type?: string, disabled?: boolean}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({ field }) => <TextField {...field} label={label} error={shouldError} helperText={shouldError ? errorMessage : ''} multiline={multiline} rows={4} fullWidth type={type} size={'small'} disabled={disabled} onChange={(e) => {
                field.onChange(name === 'ZIP' ? e.currentTarget.value.toString() : type === 'number' ? e.currentTarget.value === "" ? null : parseFloat(e.currentTarget.value, 10) : e.currentTarget.value)
            }}/>}
        />
    )
}

export default RHTextfield;
