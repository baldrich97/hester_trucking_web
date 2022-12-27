import React  from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { DeliveryLocationsModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import { useRouter } from 'next/router';
import GenericForm from '../../elements/GenericForm'
import { toast } from "react-toastify";

type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
import {FormFieldsType} from "../../utils/types";

const defaultValues = {
    Description: ''
};


const DeliveryLocation = ({initialDeliveryLocation = null}: {initialDeliveryLocation?: null | DeliveryLocationsType}) => {

    const router = useRouter();

    const validationSchema = initialDeliveryLocation ? DeliveryLocationsModel : DeliveryLocationsModel.omit({ ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialDeliveryLocation ?? defaultValues
    });
    const key = initialDeliveryLocation ? 'deliverylocations.post' : 'deliverylocations.put';

    const addOrUpdateDeliveryLocation = trpc.useMutation(key, {
        async onSuccess(data) {
            toast('Successfully Submitted!', {autoClose: 2000, type: 'success'})
            reset(initialDeliveryLocation ? data : defaultValues)
        }
    })

   const onSubmit = async (data: ValidationSchema) => {
        toast('Submitting...', {autoClose: 2000, type: 'info'})
        await addOrUpdateDeliveryLocation.mutateAsync(data)
        if (key === 'deliverylocations.put') {
            await router.replace(router.asPath);
        }
    }

    const fields: FormFieldsType = [
        {name: 'Description', size: 12, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'A description is required.', type: 'textfield', multiline: true},
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

export default DeliveryLocation;

