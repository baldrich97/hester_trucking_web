import React  from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { TrucksModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import { useRouter } from 'next/router';
import GenericForm from '../../elements/GenericForm'

type TrucksType = z.infer<typeof TrucksModel>;
import {FormFieldsType} from "../../utils/types";

const defaultValues = {
    Name: '',
    VIN: '',
    Notes: ''
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
            reset(initialTruck ? data : defaultValues)
        }
    })

    const onSubmit = async (data: ValidationSchema) => {
        await addOrUpdateTruck.mutateAsync(data)
        if (key === 'trucks.put') {
            await router.replace(router.asPath);
        }
    }

    const fields: FormFieldsType = [
        {name: 'Name', size: 7, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Truck name is required.', type: 'textfield'},
        {name: 'VIN', size: 5, required: false, type: 'textfield'},
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

