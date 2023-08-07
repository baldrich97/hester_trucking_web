import React, {useState} from "react";
import {Control, Controller} from "react-hook-form";
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from "@mui/material/FormHelperText"
import FormControl from "@mui/material/FormControl"
import {trpc} from "../utils/trpc";

const RHAutocomplete = ({
                            name,
                            control,
                            required = false,
                            defaultValue = '',
                            shouldError = false,
                            errorMessage = '',
                            label = name,
                            data = [],
                            optionLabel,
                            optionValue,
                            disabled = false,
                            searchQuery
                        }: { name: string, control: Control<any>, required?: boolean, defaultValue?: string | number | null, shouldError?: boolean, errorMessage?: string, label?: string, data: Array<any>, optionLabel: string, optionValue: string, disabled?: boolean, searchQuery: string }) => {

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
            return item[optionLabel]?.toString() ?? '';
        }
        return returnable;
    }

    const [search, setSearch] = useState('');

    const [value, setValue] = useState(defaultValue ? data.find((item) => {return item.ID == defaultValue}) ?? null : null)

    const [shouldSearch, setShouldSearch] = useState(false);

    const [searchInterval, setSearchInterval] = useState<NodeJS.Timer | null>(null);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    trpc.useQuery([searchQuery + '.search', {search}], {
        enabled: shouldSearch,
        onSuccess(data) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setOptions(data);
            setShouldSearch(false);
        },
        onError(error) {
            console.warn(error.message)
            setShouldSearch(false)
        }
    })

    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState<readonly any[]>(data ?? []);
    const loading = open && options.length === 0;

    // React.useEffect(() => {
    //     console.log(search)
    //     if (search.toString().length === 0) {
    //         setOptions(data ?? []);
    //     }
    // }, [open, search]);

    React.useEffect(() => {
        if (searchInterval) {
            clearInterval(searchInterval)
        }
        if (search.toString().replaceAll(' ', '').length === 0 || !searchQuery) {
            setOptions(data ?? [])
            return;
        }
        setSearchInterval(setInterval(() => {
            setShouldSearch(true)
        }, 100))

    }, [search]);


    return (

        <Controller
            name={name}
            control={control}
            rules={{required: required}}
            defaultValue={defaultValue}
            render={({field}) => <FormControl fullWidth={true} error={shouldError} size={'small'}>
                <Autocomplete
                    {...field}
                    id={label + '-autocomplete'}
                    open={open}
                    fullWidth={true}
                    disabled={disabled}
                    onOpen={() => {
                        setOpen(true);
                    }}
                    onClose={() => {
                        setOpen(false);
                    }}
                    isOptionEqualToValue={(option, value) => {
                      return option[optionValue] === value[optionValue]
                    }}
                    getOptionLabel={(option) => formatOptionLabel(optionLabel, option)}
                    options={options ?? data}
                    loading={loading}
                    onChange={(e, data) => {
                        setValue(data)
                        field.onChange(data ? data[optionValue] : null)
                    }}
                    value={value}
                    onInputChange={() => {
                        //donothing
                    }}
                    size={'small'}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            onChange={(e) => {
                                setSearch(e.currentTarget.value.toString())
                            }}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <React.Fragment>
                                        {loading ? <CircularProgress color="inherit" size={20}/> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ),
                            }}
                        />
                    )}
                /> {shouldError && <FormHelperText>{errorMessage}</FormHelperText>}
            </FormControl>}
        />

    )
}

export default RHAutocomplete;
