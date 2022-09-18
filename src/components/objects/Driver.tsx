import React  from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { DriversModel, StatesModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import { useRouter } from 'next/router';
import GenericForm from '../../elements/GenericForm'

type StatesType = z.infer<typeof StatesModel>;
type DriversType = z.infer<typeof DriversModel>;
import {FormFieldsType, SelectDataType} from "../../utils/types";

const defaultValues = {
    FirstName: '',
    MiddleName: '',
    LastName: '',
    Street: '',
    City: '',
    State: 25,
    ZIP: '',
    DOB: null,
    License: '',
    Phone: '',
    Email: '',
    HireDate: '',
    Notes: ''
};


const Driver = ({states, initialDriver = null}: {states: StatesType[], initialDriver?: null | DriversType}) => {

    const router = useRouter();

    const validationSchema = initialDriver ? DriversModel : DriversModel.omit({ ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialDriver ?? defaultValues
    });
    const key = initialDriver ? 'drivers.post' : 'drivers.put';

    const addOrUpdateDriver = trpc.useMutation(key, {
        async onSuccess(data) {
            reset(initialDriver ? data : defaultValues)
        }
    })

    const onSubmit = async (data: ValidationSchema) => {
        await addOrUpdateDriver.mutateAsync(data)
        if (key === 'drivers.put') {
            await router.replace(router.asPath);
        }
    }

    const fields: FormFieldsType = [
        {name: 'FirstName', size: 6, label: 'First Name', required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Driver name is required.', type: 'textfield'},
        {name: 'MiddleName', size: 6, label: 'Middle Name', required: false, type: 'textfield'},
        {name: 'LastName', size: 6, label: 'Last Name', required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Driver name is required.', type: 'textfield'},
        {name: 'Street', size: 6, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Street address is required.', type: 'textfield'},
        {name: 'City', size: 5, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'City is required.', type: 'textfield'},
        {name: 'State', size: 4,  required: false, type: 'select'},
        {name: 'ZIP', size: 3, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'ZIP code is required.', type: 'textfield', number: true},
        {name: 'DOB', size: 4, required: false, shouldErrorOn: ['invalid_type'], errorMessage: 'DOB is required.', type: 'date'},
        {name: 'License', size: 4, required: false, type: 'textfield'},
        {name: 'Phone', size: 4, required: false, type: 'textfield'},
        {name: 'Email', size: 6, required: false, type: 'textfield', shouldErrorOn: ['invalid_string'], errorMessage: 'Please enter a valid email.'},
        {name: 'HireDate', size: 6, label: 'Hire Date', required: false, type: 'textfield'},
        {name: 'Notes', size: 12, required: false, type: 'textfield', multiline: true},
    ]

    const selectData: SelectDataType = [
        {key: 'State', data: states, defaultValue: 25, optionValue: 'ID', optionLabel: 'Name'}
    ]

    console.log(errors)

    return (
        <Box
            component='form'
            autoComplete='off'
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            sx={{
                paddingLeft: 2.5
            }}
        >
            <GenericForm errors={errors} control={control} fields={fields} selectData={selectData}/>
        </Box>
    )
}

export default Driver;

