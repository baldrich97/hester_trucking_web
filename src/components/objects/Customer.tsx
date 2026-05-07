import React  from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { CustomersModel, StatesModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import { useRouter } from 'next/router';
import GenericForm from '../../elements/GenericForm'
import { toast } from "react-toastify";

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;
import {FormFieldsType, SelectDataType} from "../../utils/types";

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


const Customer = ({
    states,
    initialCustomer = null,
    onCreated,
    submitLabel = "Submit",
    skipRouteRefresh = false,
}: {
    states: StatesType[];
    initialCustomer?: null | CustomersType;
    onCreated?: (customer: CustomersType) => void;
    submitLabel?: string;
    skipRouteRefresh?: boolean;
}) => {

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
            toast('Successfully Submitted!', {autoClose: 2000, type: 'success'})
            if (!initialCustomer) {
                onCreated?.(data as CustomersType);
            }
            reset(initialCustomer ? data : defaultValues)
        }
    })

   const onSubmit = async (data: ValidationSchema) => {
        toast('Submitting...', {autoClose: 2000, type: 'info'})
        await addOrUpdateCustomer.mutateAsync(data)
        if (initialCustomer && !skipRouteRefresh) {
            await router.replace(router.asPath);
        }
    }

    const fields: FormFieldsType = [
        {name: 'Name', size: 7, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Customer name is required.', type: 'textfield'},
        {name: 'Street', size: 5, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Street address is required.', type: 'textfield'},
        {name: 'City', size: 5, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'City is required.', type: 'textfield'},
        {name: 'State', size: 4,  required: false, type: 'select'},
        {name: 'ZIP', size: 3, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'ZIP code is required.', type: 'textfield', number: true},
        {name: 'Email', size: 12, required: false, type: 'textfield', shouldErrorOn: ['invalid_string'], errorMessage: 'Please enter a valid email.'},
        {name: 'Phone', size: 6, required: false, type: 'textfield'},
        {name: 'MainContact', size: 6, label: 'Main Contact', required: false, type: 'textfield'},
        {name: 'Notes', size: 12, required: false, type: 'textfield', multiline: true},
    ]

    const selectData: SelectDataType = [
        {key: 'State', data: states, defaultValue: 25, optionValue: 'ID', optionLabel: 'Name'}
    ]

    return (
        <Box
            component='form'
            autoComplete='off'
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleSubmit(onSubmit)(e);
            }}
            sx={{
                paddingLeft: 2.5
            }}
        >
            <GenericForm
                errors={errors}
                control={control}
                fields={fields}
                selectData={selectData}
                submitDisabled={addOrUpdateCustomer.isLoading}
                submitLabel={submitLabel}
            />
        </Box>
    )
}

export default Customer;

