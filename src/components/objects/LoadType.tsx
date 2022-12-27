import React  from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { LoadTypesModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import { useRouter } from 'next/router';
import GenericForm from '../../elements/GenericForm'
import { toast } from "react-toastify";

type LoadTypesType = z.infer<typeof LoadTypesModel>;
import {FormFieldsType} from "../../utils/types";

const defaultValues = {
    Description: '',
    Notes: ''
};


const LoadType = ({initialLoadType = null}: {initialLoadType?: null | LoadTypesType}) => {

    const router = useRouter();

    const validationSchema = initialLoadType ? LoadTypesModel : LoadTypesModel.omit({ ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialLoadType ?? defaultValues
    });
    const key = initialLoadType ? 'loadtypes.post' : 'loadtypes.put';

    const addOrUpdateLoadType = trpc.useMutation(key, {
        async onSuccess(data) {
            toast('Successfully Submitted!', {autoClose: 2000, type: 'success'})
            reset(initialLoadType ? data : defaultValues)
        }
    })

   const onSubmit = async (data: ValidationSchema) => {
        toast('Submitting...', {autoClose: 2000, type: 'info'})
        await addOrUpdateLoadType.mutateAsync(data)
        if (key === 'loadtypes.put') {
            await router.replace(router.asPath);
        }
    }

    const fields: FormFieldsType = [
        {name: 'Description', size: 12, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'A description is required.', type: 'textfield', multiline: true},
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

export default LoadType;

