import React from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod'
import {
    CustomersModel,
    InvoicesModel,
    LoadsModel,
    TrucksModel,
    LoadTypesModel,
    DeliveryLocationsModel,
    DriversModel
} from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import {useRouter} from 'next/router';
import GenericForm from '../../elements/GenericForm'

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type TrucksType = z.infer<typeof TrucksModel>;
type DriversType = z.infer<typeof DriversModel>;
import {FormFieldsType, SelectDataType} from "../../utils/types";

const defaultValues = {
    StartDate: new Date(),
    EndDate: new Date(),
    CustomerID: undefined,
    LoadTypeID: undefined,
    DeliveryDescriptionID: 0,
    DriverID: 0,
    TruckID: 0,
    Hours: undefined,
    TotalAmount: undefined,
    TotalRate: undefined,
    TruckRate: undefined,
    Weight: undefined,
    MaterialRate: undefined,
    TicketNumber: 0
};


const Load = ({
                  customers,
                  loadTypes,
                  deliveryLocations,
                  trucks,
                  drivers,
                  initialLoad = null,
                  refreshData
              }: { customers: CustomersType[], loadTypes: LoadTypesType[], deliveryLocations: DeliveryLocationsType[], trucks: TrucksType[], drivers: DriversType[], initialLoad?: null | LoadsType, refreshData?: any}) => {

    const router = useRouter();

    const validationSchema = initialLoad ? LoadsModel : LoadsModel.omit({ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, resetField, reset, watch, setValue} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialLoad ?? defaultValues
    });
    const key = initialLoad ? 'loads.post' : 'loads.put';

    const addOrUpdateLoad = trpc.useMutation(key, {
        async onSuccess(data) {
           initialLoad && reset(data)
        }
    })

    const onSubmit = async (data: ValidationSchema) => {
        await addOrUpdateLoad.mutateAsync(data)
        if (key === 'loads.put') {
            resetField('Weight')
            resetField('Hours')
            resetField('TotalAmount')
            resetField('TicketNumber')
            refreshData();
        }
    }

    React.useEffect(() => {
        const subscription = watch((value, { name, type }) => {
            if (['MaterialRate', 'TruckRate', 'Hours', 'Weight'].includes(name ?? '') && type === 'change') {
                const hours = value.Hours ?? 0;
                const weight = value.Weight ?? 0;
                setValue('TotalRate', (value.MaterialRate ?? 0) + (value.TruckRate ?? 0))
                setValue('TotalAmount', (value.TotalRate ?? 0) * (hours > 0 ? hours : weight))
            }
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    //const fetchCustomerLoadTypes = trpc.useQuery(['customerloadtypes.getAll', {CustomerID: watchCustomerSelected ?? 0}])

    const watchHours = watch('Hours');
    const watchWeight = watch('Weight')

    // React.useEffect(() => {
    //     if (initialLoad) {
    //         if (watchCustomerSelected !== initialLoad.CustomerID) {
    //             const customerLoadTypes = getCustomerLoadTypes(watchCustomerSelected)
    //             console.log(customerLoadTypes)
    //         }
    //     } else {
    //         //query here and change
    //     }
    //
    //     setValue('LoadTypeID', undefined)
    // }, [setValue, watchCustomerSelected])

    const fields: FormFieldsType = [
        {
            name: 'CustomerID',
            size: initialLoad ? 10 : 12,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Customer is required.',
            type: 'select',
            label: 'Customer'
        },
        {name: 'StartDate', size: 4, required: false, type: 'date', label: 'Start Date'},
        {name: 'EndDate', size: 4, required: false, type: 'date', label: 'End Date'},
        {name: 'TicketNumber', required: false, type: 'textfield', size: 4, number: true, label: 'Ticket Number'},
        {
            name: 'DriverID',
            size: 6,
            required: false,
            type: 'select',
            label: 'Driver'
        },
        {
            name: 'TruckID',
            size: 6,
            required: false,
            type: 'select',
            label: 'Truck'
        },
        {
            name: 'LoadTypeID',
            size: 6,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Load type is required.',
            type: 'select',
            label: 'Load Type'
        },
        {
            name: 'DeliveryLocationID',
            size: 6,
            required: false,
            type: 'select',
            label: 'Delivery Location'
        },
        {name: 'MaterialRate', required: false, type: 'textfield', size: 3, number: true, label: 'Material Rate'},
        {name: 'TruckRate', required: false, type: 'textfield', size: 3, number: true, label: 'Truck Rate'},
        {name: 'Weight', required: false, type: 'textfield', size: 3, number: true, disabled: !!(watchHours && watchHours > 0)},
        {name: 'Hours', required: false, type: 'textfield', size: 3, number: true, disabled: !!(watchWeight && watchWeight > 0)},
        {name: 'Received', size: 6, required: false, type: 'textfield'},
        {name: 'TotalRate', required: false, type: 'textfield', size: 3, number: true, label: 'Total Rate'},
        {name: 'TotalAmount', required: false, type: 'textfield', size: 3, number: true, label: 'Total Amount'},
        {name: 'Notes', size: 12, required: false, type: 'textfield', multiline: true},
    ]

    if (initialLoad) {
        fields.splice(1, 0, {name: 'Invoiced', size: 2, required: false, type: 'checkbox', disabled: true});
    }

    const selectData: SelectDataType = [
        {key: 'CustomerID', data: customers, optionValue: 'ID', optionLabel: 'Name+|+Street+,+City'},
        {key: 'LoadTypeID', data: loadTypes, optionValue: 'ID', optionLabel: 'Description'},
        {key: 'DeliveryLocationID', data: deliveryLocations, optionValue: 'ID', optionLabel: 'Description', defaultValue: 0},
        {key: 'TruckID', data: trucks, optionValue: 'ID', optionLabel: 'Name', defaultValue: 0},
        {key: 'DriverID', data: drivers, optionValue: 'ID', optionLabel: 'FirstName+LastName', defaultValue: 0},
    ]

    return (
        <>
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
        </>
    )
}

export default Load;

