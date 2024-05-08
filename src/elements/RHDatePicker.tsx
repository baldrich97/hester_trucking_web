import React from "react";
import {Control, Controller} from "react-hook-form";
import {DesktopDatePicker} from "@mui/x-date-pickers";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText"
import FormControl from "@mui/material/FormControl"
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import moment from "moment";

const RHDatePicker = ({ name, control, required = false, defaultValue = '', shouldError = false, errorMessage = '', label = name, disabled = false, week = false}: {name: string, control: Control<any>, required?: boolean, defaultValue?: string, shouldError?: boolean, errorMessage?: string, label?: string, disabled?: boolean, week?: boolean}) => {
    const checkKeyDown = (e: { key: string; preventDefault: () => void; }) => {
        if (e.key === 'Enter') {
            e.preventDefault()
        }
    };
    return week ? (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({ field }) => <div style={{
                position: 'relative'
            }}>
                <label style={{
                    fontSize: 14,
                    position: "absolute",
                    top: -9,
                    left: 8,
                    backgroundColor: '#F5F5F5',
                    paddingLeft: 4,
                    paddingRight: 4
                }}>{label}</label>
                <input type="week" style={{
                    border: 1,
                    borderStyle: 'solid',
                    borderColor: '#ccc',
                    borderRadius: 4,
                    padding: 8,
                    fontSize: 16,
                    outline: 'none',
                    backgroundColor: '#F5F5F5'
                }} {...field}/>
            </div>}
        />
    ) : (
        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({ field }) => {
                if (typeof(field.value) === 'string' && field.value.includes('T00:00:00')) {
                    field.value = moment.utc(field.value, "YYYY-MM-DD").format('YYYY-MM-DD')
                    field.value += "T10:00:00.000Z"
                }
                return (
                    <FormControl fullWidth={true} error={shouldError} onKeyPress={(e) => checkKeyDown(e)}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DesktopDatePicker {...field} disabled={disabled} onChange={(event) => {field.onChange(event)}} label={label ?? name}  renderInput={(params) => <TextField {...params} size={'small'}/>}/> {shouldError && <FormHelperText>{errorMessage}</FormHelperText>}
                        </LocalizationProvider>
                    </FormControl>
                )
            }}
        />
    )
}

export default RHDatePicker;

// .custom-input
//
// .custom-input label
//
// .custom-input input
//
// .custom-input input:focus {
//     border-color: #007bff; /* Change color to match MUI input focus color */
// }