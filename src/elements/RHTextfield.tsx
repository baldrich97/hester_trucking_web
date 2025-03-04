import React from "react";
import {Control, Controller} from "react-hook-form";
import TextField from "@mui/material/TextField";

const RHTextfield = ({ name, control, required = false, defaultValue = '', shouldError = false, errorMessage = '', label = name, multiline = false, type = 'text', disabled = false, maxRows = 1}: {name: string, control: Control<any>, required?: boolean, defaultValue?: string, shouldError?: boolean, errorMessage?: string, label?: string, multiline?: boolean, maxRows?: number, type?: string, disabled?: boolean}) => {
    // const checkKeyDown = (e: { key: string; preventDefault: () => void; }) => {
    //     if (e.key === 'Enter') {
    //         e.preventDefault()
    //     }
    // };
    return (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({ field }) => <TextField {...field} label={label} error={shouldError} helperText={shouldError ? errorMessage : ''} multiline={multiline} rows={maxRows ?? 4} fullWidth type={type} size={'small'} disabled={disabled}
                                              // onKeyPress={(e) => checkKeyDown(e)}
                                              onChange={(e) => {
                field.onChange(name === 'ZIP' ? e.currentTarget.value.toString() : type === 'number' ? e.currentTarget.value === "" ? null : parseFloat(e.currentTarget.value) : e.currentTarget.value)
            }}/>}
        />
    )
}

export default RHTextfield;
