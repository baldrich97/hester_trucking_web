import React from "react";
import {Control, Controller} from "react-hook-form";
import TextField from "@mui/material/TextField";

const RHTextfield = ({ name, control, required = false, defaultValue = '', shouldError = false, errorMessage = '', label = name, multiline = false, maxRows = 4, type = 'text'}: {name: string, control: Control<any>, required?: boolean, defaultValue?: string, shouldError?: boolean, errorMessage?: string, label?: string, multiline?: boolean, maxRows?: number, type?: string}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({ field }) => <TextField {...field} label={label} error={shouldError} helperText={shouldError ? errorMessage : ''} multiline={multiline} rows={4} fullWidth type={type} size={'small'}/>}
        />
    )
}

export default RHTextfield;