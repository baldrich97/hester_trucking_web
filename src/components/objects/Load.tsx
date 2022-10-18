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
    DeliveryDescriptionID: undefined,
    DriverID: undefined,
    TruckID: undefined,
    Hours: 0,
    TotalAmount: 0,
    TotalRate: 0,
    TruckRate: 0,
    Weight: 0,
    MaterialRate: 0,
    TicketNumber: 0
};


const Load = ({
                  customers,
                  loadTypes,
                  deliveryLocations,
                  trucks,
                  drivers,
                  initialLoad = null
              }: { customers: CustomersType[], loadTypes: LoadTypesType[], deliveryLocations: DeliveryLocationsType[], trucks: TrucksType[], drivers: DriversType[], initialLoad?: null | LoadsType }) => {

    const router = useRouter();

    const validationSchema = initialLoad ? LoadsModel : LoadsModel.omit({ID: true})

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset, watch, setValue} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialLoad ?? defaultValues
    });
    const key = initialLoad ? 'loads.post' : 'loads.put';

    const addOrUpdateLoad = trpc.useMutation(key, {
        async onSuccess(data) {
            reset(initialLoad ? data : defaultValues)
        }
    })

    const onSubmit = async (data: ValidationSchema) => {
        await addOrUpdateLoad.mutateAsync(data)
        if (key === 'loads.put') {
            await router.replace(router.asPath);
        }
    }

    const watchTicketNumber = watch('TicketNumber');

    React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (watchTicketNumber === '') setValue('TicketNumber', 0);

        else if (typeof (watchTicketNumber) === 'string') {

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setValue('TicketNumber', parseInt(watchTicketNumber))

        }
    }, [watchTicketNumber])

    const fields: FormFieldsType = [
        {name: 'StartDate', size: 12, required: false, type: 'date', label: 'Start Date'},
        {name: 'EndDate', size: 12, required: false, type: 'date', label: 'End Date'},
        {name: 'Weight', required: false, type: 'textfield', size: 3, number: true},
        {name: 'Hours', required: false, type: 'textfield', size: 3, number: true},
        {name: 'TotalRate', required: false, type: 'textfield', size: 3, number: true, label: 'Total Rate'},
        {name: 'TotalAmount', required: false, type: 'textfield', size: 3, number: true, label: 'Total Amount'},
        {name: 'TruckRate', required: false, type: 'textfield', size: 3, number: true, label: 'Truck Rate'},
        {name: 'MaterialRate', required: false, type: 'textfield', size: 3, number: true, label: 'Material Rate'},
        {name: 'Received', size: 6, required: false, type: 'textfield'},
        {name: 'Notes', size: 6, required: false, type: 'textfield'},
        {name: 'TicketNumber', required: false, type: 'textfield', size: 3, number: true, label: 'Ticket Number'},
        {
            name: 'CustomerID',
            size: 5,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Customer is required.',
            type: 'select',
            label: 'Customer'
        },
        {
            name: 'LoadTypeID',
            size: 5,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Load type is required.',
            type: 'select',
            label: 'Load Type'
        },
        {
            name: 'DeliveryLocationID',
            size: 5,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Delivery location is required.',
            type: 'select',
            label: 'Delivery Location'
        },
        {
            name: 'TruckID',
            size: 5,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Truck is required.',
            type: 'select',
            label: 'Truck'
        },
        {
            name: 'DriverID',
            size: 5,
            required: true,
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Driver is required.',
            type: 'select',
            label: 'Driver'
        },
    ]

    if (initialLoad) {
        fields.push({name: 'Invoiced', size: 6, required: false, type: 'checkbox'});
    }

    const selectData: SelectDataType = [
        {key: 'CustomerID', data: customers, optionValue: 'ID', optionLabel: 'Name'},
        {key: 'LoadTypeID', data: loadTypes, optionValue: 'ID', optionLabel: 'Description'},
        {key: 'DeliveryLocationID', data: deliveryLocations, optionValue: 'ID', optionLabel: 'Description'},
        {key: 'TruckID', data: trucks, optionValue: 'ID', optionLabel: 'Name'},
        {key: 'DriverID', data: drivers, optionValue: 'ID', optionLabel: 'FirstName+LastName'},
    ]

    return (
        <>
            {console.log(errors)}
            {console.log(initialLoad)}
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

