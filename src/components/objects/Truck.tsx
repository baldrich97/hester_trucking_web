import React  from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { TrucksModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import { useRouter } from 'next/router';
import GenericForm from '../../elements/GenericForm'
import { toast } from "react-toastify";

type TrucksType = z.infer<typeof TrucksModel>;
import {FormFieldsType} from "../../utils/types";

const defaultValues = {
    Name: '',
    VIN: '',
    Notes: '',
    Make: '',
    LicensePlate: '',
    Model: '',
    TruckNumber: ''
};


const Truck = ({initialTruck = null}: {initialTruck?: null | TrucksType}) => {

    const router = useRouter();

    const validationSchema = initialTruck ? TrucksModel : TrucksModel.omit({ ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialTruck ?? defaultValues
    });
    const key = initialTruck ? 'trucks.post' : 'trucks.put';

    const addOrUpdateTruck = trpc.useMutation(key, {
        async onSuccess(data) {
            toast('Successfully Submitted!', {autoClose: 2000, type: 'success'})
            reset(initialTruck ? data : defaultValues)
        }
    })

   const onSubmit = async (data: ValidationSchema) => {
        toast('Submitting...', {autoClose: 2000, type: 'info'})
        await addOrUpdateTruck.mutateAsync(data)
        if (key === 'trucks.put') {
            await router.replace(router.asPath);
        }
    }

    const fields: FormFieldsType = [
        {name: 'Name', size: 6, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Truck name is required.', type: 'textfield'},
        {name: 'VIN', size: 6, required: false, type: 'textfield'},
        {name: 'Make', size: 6, required: false, type: 'textfield'},
        {name: 'LicensePlate', size: 6, required: false, type: 'textfield', label: 'License Plate'},
        {name: 'Model', size: 6, required: false, type: 'textfield'},
        {name: 'TruckNumber', size: 6, required: false, type: 'textfield', label: 'Truck Number'},
        {name: 'Notes', size: 12, required: false, type: 'textfield', multiline: true},
    ]

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
            <GenericForm errors={errors} control={control} fields={fields}/>
        </Box>
    )
}

export default Truck;

