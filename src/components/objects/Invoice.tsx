import React  from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { CustomersModel, InvoicesModel, LoadsModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import { useRouter } from 'next/router';
import GenericForm from '../../elements/GenericForm'

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
import {FormFieldsType, SelectDataType} from "../../utils/types";

const defaultValues = {
    InvoiceDate: new Date(),
    Number: 0,
    CustomerID: undefined,
    TotalAmount: 0,
    PaidDate: null,
    CheckNumber: '',
    Paid: false,
    Printed: false
};


const Invoice = ({customers, loads, initialInvoice = null}: {customers: CustomersType[], loads: LoadsType[], initialInvoice?: null | InvoicesType}) => {

    const router = useRouter();

    const validationSchema = initialInvoice ? InvoicesModel : InvoicesModel.omit({ ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialInvoice ?? defaultValues
    });
    const key = initialInvoice ? 'invoices.post' : 'invoices.put';

    const addOrUpdateInvoice = trpc.useMutation(key, {
        async onSuccess(data) {
            reset(initialInvoice ? data : defaultValues)
        }
    })

    const onSubmit = async (data: ValidationSchema) => {
        await addOrUpdateInvoice.mutateAsync(data)
        if (key === 'invoices.put') {
            await router.replace(router.asPath);
        }
    }

    const fields: FormFieldsType = [
        {name: 'InvoiceDate', size: 4, required: true, shouldErrorOn: ['required', 'invalid_type'], errorMessage: 'Invoice date is required.', type: 'date', label: 'Invoice Date'},
        {name: 'CustomerID', size: 5,  required: true, shouldErrorOn: ['invalid_type'], errorMessage: 'Customer is required.', type: 'select', label: 'Customer'},
        {name: 'Number', size: 3, required: false, type: 'textfield', number: true},
        {name: 'TotalAmount', size: 3, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Total amount is required.', type: 'textfield', number: true, label: 'Total Amount'},
        {name: 'PaidDate', size: 12, required: false, type: 'date', label: 'Paid Date'},
        {name: 'CheckNumber', size: 6, required: false, type: 'textfield', label: 'Check Number'},
        {name: 'PaymentType', size: 6, required: false, type: 'select', label: 'Payment Type'},
        {name: 'Paid', size: 6, required: false, type: 'checkbox'},
        {name: 'Printed', size: 6, required: false, type: 'checkbox'},
    ]

    const selectData: SelectDataType = [
        {key: 'CustomerID', data: customers, optionValue: 'ID', optionLabel: 'Name'},
        {key: 'PaymentType', data: [{ID: 0, name: 'Cash'}, {ID: 1, name: 'Credit Card'}, {ID: 2, name: 'Check'}, {ID: 3, name: ''}], optionValue: 'ID', optionLabel: 'name', defaultValue: undefined}
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
            <GenericForm errors={errors} control={control} fields={fields} selectData={selectData}/>
        </Box>
    )
}

export default Invoice;

