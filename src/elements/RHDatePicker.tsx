import React from "react";
import {Control, Controller} from "react-hook-form";
import {DesktopDatePicker} from "@mui/x-date-pickers";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText"
import FormControl from "@mui/material/FormControl"
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const RHDatePicker = ({ name, control, required = false, defaultValue = '', shouldError = false, errorMessage = '', label = name}: {name: string, control: Control<any>, required?: boolean, defaultValue?: string, shouldError?: boolean, errorMessage?: string, label?: string}) => {

    return (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({ field }) => <FormControl fullWidth={true} error={shouldError}> <LocalizationProvider dateAdapter={AdapterDateFns}> <DesktopDatePicker {...field} onChange={(event) => {field.onChange(event)}} label={label ?? name}  renderInput={(params) => <TextField {...params} size={'small'}/>}/> {shouldError && <FormHelperText>{errorMessage}</FormHelperText>} </LocalizationProvider>
            </FormControl>}
        />
    )
}

export default RHDatePicker;
