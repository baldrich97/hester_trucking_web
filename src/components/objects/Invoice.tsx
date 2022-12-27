import React, {useState} from 'react';
import Box from "@mui/material/Box";
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import TextField from "@mui/material/TextField";
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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
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
    Printed: false,
    PaymentType: 'N/A'
};


const Invoice = ({
                     customers,
                     loads = [],
                     initialInvoice = null
                 }: { customers: CustomersType[], loads?: LoadsType[], initialInvoice?: null | InvoicesType }) => {

    const [customer, setCustomer] = useState(0);

    const [paid, setPaid] = useState(initialInvoice?.Paid ?? false);

    const [shouldFetchLoads, setShouldFetchLoads] = useState(false);

    const [customerLoads, setCustomerLoads] = useState<any>([]);

    const [selected, setSelected] = useState<any>(!initialInvoice ? [] : loads?.map((load) => load.ID.toString()));

    const [paymentAmount, setPaymentAmount] = useState<number>(0);

    const [paymentType, setPaymentType] = useState<string>('Check');

    //this is for forcing it to rerender
    const [_, forceUpdate] = React.useReducer((x) => x + 1, 0);

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const router = useRouter();

    let validationSchema = initialInvoice ? InvoicesModel : InvoicesModel.omit({ID: true})

    validationSchema = validationSchema.extend({
        selected: z.array(z.string())
    })

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset, watch, setValue} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialInvoice ?? defaultValues
    });

    if (initialInvoice) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setValue('selected', selected);
    }

    const key = initialInvoice ? 'invoices.post' : 'invoices.put';

    const addOrUpdateInvoice = trpc.useMutation(key, {
        async onSuccess(data) {
            reset(initialInvoice ? data : defaultValues)
        }
    })

    const payInvoice = trpc.useMutation('invoices.postPaid', {
        async onSuccess(data) {
            reset(data ? data : defaultValues)
        }
    })

    const printInvoice = trpc.useMutation('invoices.postPrinted', {
        async onSuccess(data) {
            reset(data ? data : defaultValues)
        }
    })

    trpc.useQuery(['loads.getByCustomer', {customer}], {
        enabled: shouldFetchLoads,
        onSuccess(data) {
            setCustomerLoads(data);
            setShouldFetchLoads(false);
            setValue('TotalAmount', 0)
        },
        onError(error) {
            console.warn(error);
        }
    })

    const onSubmit = async (data: ValidationSchema) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await addOrUpdateInvoice.mutateAsync(data)
        if (key === 'invoices.put') {
            await router.replace(router.asPath);
        }
        setShouldFetchLoads(true);
    }

    React.useEffect(() => {
        const subscription = watch((value, {name, type}) => {
            if (['CustomerID'].includes(name ?? '') && type === 'change') {
                const customerID = value.CustomerID ?? 0;
                setCustomer(customerID);
                setShouldFetchLoads(true);
            } else if (['CustomerID'].includes(name ?? '') && type === 'change') {
                const newPaid = value.Paid ?? false;
                setPaid(newPaid);
            }
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    const fields1: FormFieldsType = !initialInvoice ? [
        {
            name: 'CustomerID',
            size: 9,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Customer is required.',
            type: 'select',
            label: 'Customer'
        }, {name: 'Number', size: 3, required: false, type: 'textfield', number: true},
    ] : [
        {
            name: 'CustomerID',
            size: 6,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Customer is required.',
            type: 'select',
            label: 'Customer',
            disabled: true
        },
        {name: 'Paid', size: 2, required: false, type: 'checkbox', disabled: true},
        {name: 'Printed', size: 2, required: false, type: 'checkbox', disabled: true}, {
            name: 'Number',
            size: 2,
            required: false,
            type: 'textfield',
            number: true
        },
    ];

    const fields2: FormFieldsType = [];

    if (initialInvoice) {
        fields2.push({name: 'PaidDate', size: 4, required: false, type: 'date', label: 'Paid Date'},
            {name: 'CheckNumber', size: 3, required: false, type: 'textfield', label: 'Check Number'},
            {name: 'PaymentType', size: 3, required: false, type: 'textfield', label: 'Payment Type', disabled: true},)
    } else {
        fields2.push({name: '', size: 7, required: false, type: 'padding'})
    }

    fields2.push({
        name: 'TotalAmount',
        size: !initialInvoice ? 5 : 2,
        required: true,
        shouldErrorOn: ['required', 'too_small'],
        errorMessage: 'Total amount is required.',
        type: 'textfield',
        number: true,
        label: 'Total Amount'
    })

    const selectData: SelectDataType = [
        {key: 'CustomerID', data: customers, optionValue: 'ID', optionLabel: 'Name+|+Street+,+City'}
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
                                  disabled={field.disabled}
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
                                      errorMessage={field.errorMessage} label={field.label} disabled={true}/>
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
            case "padding": {
                return (
                    <Grid2 xs={field.size} key={'form-' + index.toString() + '-padding'}></Grid2>
                )
            }
        }
    }

    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        border: '2px solid #000',
        boxShadow: 24,
        p: 4,
    };

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
            <div>
                <Modal
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Box sx={style}>
                        <Typography id="modal-modal-title" variant="h6" component="h2" style={{paddingBottom: 10}}>
                            Enter payment information
                        </Typography>
                        <Grid2 container columnSpacing={2} justifyContent={'right'}>
                            <Grid2 xs={6}>
                                <FormControl fullWidth={true} size={'small'}>
                                    <InputLabel id={"payment-label"}>Payment Type</InputLabel>
                                    <Select label={'Payment Type'} value={paymentType} onChange={(e) => {setPaymentType(e.target.value)}}>
                                        <MenuItem key={'SelectOption-Check'} value={'Check'}>Check</MenuItem>
                                        <MenuItem key={'SelectOption-Cash'} value={'Cash'}>Cash</MenuItem>
                                        <MenuItem key={'SelectOption-Credit_Card'} value={'Credit Card'}>Credit Card</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid2>
                            {/*<Grid2 xs={6}>
                                <TextField label={'Payment Amount'} value={paymentAmount} fullWidth type={'number'} size={'small'} onChange={(e) => {
                                    setPaymentAmount(parseInt(e.currentTarget.value, 10));
                                }}/>
                            </Grid2>*/}
                            <Grid2 xs={6} style={{paddingTop: 5}}>
                                <Button variant={'contained'} color={'success'}
                                        style={{backgroundColor: '#66bb6a'}} onClick={async () => {
                                            if (!['Cash', 'Check', 'Credit Card'].includes(paymentType)) {
                                                handleClose();
                                            } else {
                                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                                // @ts-ignore
                                                await payInvoice.mutateAsync({...initialInvoice, PaymentType: paymentType, selected: []});
                                                setPaymentType('Check')
                                                setPaymentAmount(0)
                                                handleClose();
                                                forceUpdate();
                                            }
                                }}>Submit Payment</Button>
                            </Grid2>
                        </Grid2>
                    </Box>
                </Modal>
            </div>
            <Grid2 container columnSpacing={2} rowSpacing={2}
                   justifyContent={!initialInvoice ? 'space-between' : 'right'}>
                {fields1.map((field, index) => renderFields(field, index))}

                <Grid2 xs={12}>
                    <InvoiceLoads readOnly={!!initialInvoice} rows={loads.length > 0 ? loads : customerLoads}
                                  updateTotal={(newTotal: number) => {
                                      setValue('TotalAmount', newTotal)
                                  }} updateSelected={(newSelected: string[]) => {
                        setSelected(newSelected);
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        setValue('selected', newSelected);
                    }}/>
                </Grid2>

                {fields2.map((field, index) => renderFields(field, index))}

                {!initialInvoice && <Grid2 xs={3}>
                    <Button type={'submit'} variant={'contained'} color={'primary'}
                            style={{backgroundColor: '#1565C0'}} disabled={selected.length === 0}>Submit</Button>
                </Grid2>}

                {initialInvoice && <>
                    <Grid2 xs={1}>
                        <Button variant={'contained'} color={'warning'}
                                style={{backgroundColor: '#ffa726'}} onClick={async () => {
                            const element = document.createElement("a");
                            element.href = "/api/getPDF/" + initialInvoice.ID?.toString();
                            element.download = 'invoice-download.pdf';
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                            await printInvoice.mutateAsync({...initialInvoice, selected: []});
                        }}>Print</Button>
                    </Grid2>
                    <Grid2 xs={1}>
                        <Button variant={'contained'} color={'success'}
                                style={{backgroundColor: '#66bb6a'}} disabled={!!initialInvoice.Paid || paid} onClick={handleOpen}>Pay</Button>
                    </Grid2>
                    <Grid2 xs={1}>
                        <Button type={'submit'} variant={'contained'} color={'primary'}
                                style={{backgroundColor: '#1565C0'}}>Submit</Button>
                    </Grid2>
                </>}
            </Grid2>
        </Box>
    )
}

export default Invoice;

