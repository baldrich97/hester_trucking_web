import React from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import RHTextfield from "./RHTextfield";
import RHSelect from "./RHSelect";
import {Control} from "react-hook-form";
import Button from "@mui/material/Button";

const GenericForm = ({
                         errors = [],
                         control,
                         fields = [],
                         selectData = []
                     }: { errors: any, control: Control<any>, fields: { name: string, size: number, label?: string, required: boolean, errorMessage?: string, type: 'textfield' | 'select' | 'checkbox', shouldErrorOn?: string[], multiline?: boolean, maxRows?: number, number?: boolean }[], selectData?: { key: string, data: Record<string, unknown>[], optionValue: string, optionLabel: string, defaultValue?: number }[] }) => {

    return (
        <Grid2 container columnSpacing={2} rowSpacing={2}>
            {fields.map((field, index) => {
                switch (field.type) {
                    case "textfield": {
                        return (
                            <Grid2 xs={field.size} key={'form-' + index.toString() + '-' + field.name + '-grid'}>
                                <RHTextfield name={field.name} control={control} required={field.required}
                                             label={field.label ?? field.name} type={field.number ? 'number' : 'text'}
                                             shouldError={field.shouldErrorOn?.includes(errors.Name?.type)}
                                             errorMessage={field.errorMessage ?? ''} multiline={!!field.multiline}
                                             maxRows={field.maxRows ?? 1} key={'form-' + index.toString() + '-' + field.name + '-field'}/>
                            </Grid2>
                        )
                    }
                    case "select": {
                        const foundData = selectData.filter((item) => item.key === field.name)[0]
                        if (!foundData) {
                            //error here
                            return null;
                        }

                        const {data, optionValue, optionLabel, defaultValue} = foundData;

                        return (
                            <Grid2 xs={field.size} key={'form-' + index.toString() + '-' + field.name + '-grid'}>
                                <RHSelect name={field.name} control={control} data={data} optionLabel={optionLabel}
                                          optionValue={optionValue} defaultValue={defaultValue ?? 4} key={'form-' + index.toString() + '-' + field.name + '-field'}/>
                            </Grid2>
                        )
                    }
                }
            })}

            <Grid2 xs={3}>
                <Button type={'submit'} variant={'contained'} color={'primary'} style={{backgroundColor: '#1565C0'}}>Submit</Button>
            </Grid2>
        </Grid2>
    )
}

export default GenericForm;