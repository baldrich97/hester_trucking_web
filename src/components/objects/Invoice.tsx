import React, {useState} from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod'
import {CustomersModel, InvoicesModel, LoadsModel} from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import {useRouter} from 'next/router';
import {FormFieldsType, SelectDataType} from "../../utils/types";
import Grid2 from "@mui/material/Unstable_Grid2";
import RHTextfield from "../../elements/RHTextfield";
import RHSelect from "../../elements/RHSelect";
import RHDatePicker from "../../elements/RHDatePicker";
import RHCheckbox from "../../elements/RHCheckbox";
import Button from "@mui/material/Button";
import InvoiceLoads from "../collections/InvoiceLoads";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;

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


const Invoice = ({
                     customers,
                     loads,
                     initialInvoice = null
                 }: { customers: CustomersType[], loads: LoadsType[], initialInvoice?: null | InvoicesType }) => {

    const [customer, setCustomer] = useState(0);

    const [shouldFetchLoads, setShouldFetchLoads] = useState(false);

    const [customerLoads, setCustomerLoads] = useState<any>([]);

    const [selected, setSelected] = useState<any>([]);

    const router = useRouter();

    const validationSchema = initialInvoice ? InvoicesModel : InvoicesModel.omit({ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset, watch, setValue} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialInvoice ?? defaultValues
    });
    const key = initialInvoice ? 'invoices.post' : 'invoices.put';

    const addOrUpdateInvoice = trpc.useMutation(key, {
        async onSuccess(data) {
            reset(initialInvoice ? data : defaultValues)
        }
    })

    trpc.useQuery(['loads.getByCustomer', {customer}], {
        enabled: shouldFetchLoads,
        onSuccess(data) {
            console.log(data)
            setCustomerLoads(data);
            setShouldFetchLoads(false);
        },
        onError(error) {
            console.warn(error);
        }
    })

    const onSubmit = async (data: ValidationSchema) => {
        await addOrUpdateInvoice.mutateAsync(data)
        if (key === 'invoices.put') {
            await router.replace(router.asPath);
        }
    }

    React.useEffect(() => {
        const subscription = watch((value, {name, type}) => {
            if (['CustomerID'].includes(name ?? '') && type === 'change') {
                const customerID = value.CustomerID ?? 0;
                setCustomer(customerID);
                setShouldFetchLoads(true);
            }
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    const fields1: FormFieldsType = [
        {
            name: 'CustomerID',
            size: 9,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Customer is required.',
            type: 'select',
            label: 'Customer'
        },{name: 'Number', size: 3, required: false, type: 'textfield', number: true},
    ];

    const fields2: FormFieldsType = [
        {
            name: 'TotalAmount',
            size: 5,
            required: true,
            shouldErrorOn: ['required', 'too_small'],
            errorMessage: 'Total amount is required.',
            type: 'textfield',
            number: true,
            label: 'Total Amount'
        },
    ]

    if (initialInvoice) {
        fields2.push({name: 'PaidDate', size: 12, required: false, type: 'date', label: 'Paid Date'},
            {name: 'CheckNumber', size: 6, required: false, type: 'textfield', label: 'Check Number'},
            {name: 'PaymentType', size: 6, required: false, type: 'select', label: 'Payment Type'},{name: 'Paid', size: 6, required: false, type: 'checkbox'},
            {name: 'Printed', size: 6, required: false, type: 'checkbox'})
    }

    const selectData: SelectDataType = [
        {key: 'CustomerID', data: customers, optionValue: 'ID', optionLabel: 'Name+|+Street+,+City'},
        {
            key: 'PaymentType',
            data: [{ID: 0, name: 'Cash'}, {ID: 1, name: 'Credit Card'}, {ID: 2, name: 'Check'}, {ID: 3, name: ''}],
            optionValue: 'ID',
            optionLabel: 'name',
            defaultValue: undefined
        }
    ]

    function renderFields(field: any, index: number) {
        switch (field.type) {
            case "textfield": {
                return (
                    <Grid2 xs={field.size} key={'form-' + index.toString() + '-' + field.name + '-grid'}>
                        <RHTextfield name={field.name} control={control} required={field.required}
                                     label={field.label ?? field.name} type={field.number ? 'number' : 'text'}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                                     shouldError={field.shouldErrorOn?.includes(errors[field.name]?.type)}
                                     errorMessage={field.errorMessage ?? ''} multiline={!!field.multiline}
                                     maxRows={field.maxRows ?? 1}
                                     key={'form-' + index.toString() + '-' + field.name + '-field'}
                                     disabled={field.disabled}/>
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
                                  optionValue={optionValue} defaultValue={defaultValue ?? undefined}
                                  key={'form-' + index.toString() + '-' + field.name + '-field'} label={field.label}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                                  shouldError={field.shouldErrorOn?.includes(errors[field.name]?.type)}
                                  errorMessage={field.errorMessage ?? ''}/>
                    </Grid2>
                )
            }
            case "date": {
                return (
                    <Grid2 xs={field.size} key={'form-' + index.toString() + '-' + field.name + '-grid'}>
                        <RHDatePicker name={field.name} control={control} required={field.required}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                                      shouldError={field.shouldErrorOn?.includes(errors[field.name]?.type)}
                                      errorMessage={field.errorMessage} label={field.label}/>
                    </Grid2>
                )
            }
            case "checkbox": {
                return (
                    <Grid2 xs={field.size} key={'form-' + index.toString() + '-' + field.name + '-grid'}>
                        <RHCheckbox name={field.name} control={control}
                                    key={'form-' + index.toString() + '-' + field.name + '-field'} label={field.label}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                                    shouldError={field.shouldErrorOn?.includes(errors[field.name]?.type)}
                                    errorMessage={field.errorMessage ?? ''} disabled={field.disabled}/>
                    </Grid2>
                )
            }
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
            <Grid2 container columnSpacing={2} rowSpacing={2} justifyContent={'space-between'}>
                {fields1.map((field, index) => renderFields(field, index))}

                <Grid2 xs={12}>
                    <InvoiceLoads rows={customerLoads} updateTotal={(newTotal: number) => {setValue('TotalAmount', newTotal)}} updateSelected={(newSelected: string[]) => {setSelected(newSelected)}}/>
                </Grid2>

                {fields2.map((field, index) => renderFields(field, index))}

                <Grid2 xs={3}>
                    <Button type={'submit'} variant={'contained'} color={'primary'}
                            style={{backgroundColor: '#1565C0'}} disabled={selected.length === 0}>Submit</Button>
                </Grid2>
            </Grid2>
        </Box>
    )
}

export default Invoice;

