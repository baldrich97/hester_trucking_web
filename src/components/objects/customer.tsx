import React, { useState } from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import RHTextfield from "../../elements/RHTextfield";
import RHSelect from "../../elements/RHSelect";
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { CustomersModel, StatesModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import Button from '@mui/material/Button'
import { useRouter } from 'next/router';

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;

const defaultValues = {
    Name: '',
    Street: '',
    City: '',
    State: 25,
    ZIP: '',
    Phone: '',
    Email: '',
    MainContact: '',
    Notes: ''
};


const Customer = ({states, initialCustomer = null}: {states: StatesType[], initialCustomer?: null | CustomersType}) => {

    const router = useRouter();

    const validationSchema = initialCustomer ? CustomersModel : CustomersModel.omit({ ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialCustomer ?? defaultValues
    });
    const key = initialCustomer ? 'customers.post' : 'customers.put';

    const addOrUpdateCustomer = trpc.useMutation(key, {
        async onSuccess(data) {
            reset(initialCustomer ? data : defaultValues)
        }
    })

    const onSubmit = async (data: ValidationSchema) => {
        await addOrUpdateCustomer.mutateAsync(data)
        if (key === 'customers.put') {
            await router.replace(router.asPath);
        }
    }

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
            <Grid2 container columnSpacing={2} rowSpacing={2}>
                <Grid2 xs={6}>
                    <RHTextfield name={'Name'} control={control} required={true}
                                 shouldError={errors.Name?.type === 'required' || errors.Name?.type === 'too_small'}
                                 errorMessage={'Customer name is required.'}/>
                </Grid2>

                <Grid2 xs={6}>
                    <RHTextfield name={'MainContact'} control={control} label={'Main Contact'}/>
                </Grid2>

                <Grid2 xs={12}>
                    <RHTextfield name={'Street'} control={control} required={true}
                                 shouldError={errors.Street?.type === 'required' || errors.Street?.type === 'too_small'}
                                 errorMessage={'Street address is required.'}/>
                </Grid2>

                <Grid2 xs={6}>
                    <RHTextfield name={'City'} control={control} required={true}
                                 shouldError={errors.City?.type === 'required' || errors.City?.type === 'too_small'}
                                 errorMessage={'City is required.'}/>
                </Grid2>

                <Grid2 xs={3}>
                    <RHSelect name={'State'} control={control} data={states} optionLabel={'Name'} optionValue={'ID'} defaultValue={25}/>
                </Grid2>

                <Grid2 xs={3}>
                    <RHTextfield name={'ZIP'} control={control} required={true}
                                 shouldError={errors.ZIP?.type === 'required' || errors.ZIP?.type === 'too_small'}
                                 errorMessage={'ZIP code is required.'} type={'number'}/>
                </Grid2>

                <Grid2 xs={12}>
                    <RHTextfield name={'Phone'} control={control}/>
                </Grid2>

                <Grid2 xs={12}>
                    <RHTextfield name={'Email'} control={control}
                                 shouldError={errors.Email?.type === 'invalid_string'}
                                 errorMessage={'Please enter a valid email.'}/>
                </Grid2>

                <Grid2 xs={12}>
                    <RHTextfield name={'Notes'} control={control} multiline={true}/>
                </Grid2>

                <Grid2 xs={12}>
                    <input type={'submit'}/>
                </Grid2>
            </Grid2>
        </Box>
    )
}

export default Customer;

