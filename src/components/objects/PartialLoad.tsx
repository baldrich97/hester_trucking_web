import React, {useState} from "react";
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {
    CustomersModel,
    InvoicesModel,
    LoadsModel,
    TrucksModel,
    LoadTypesModel,
    DeliveryLocationsModel,
    DriversModel,
    CompleteTrucksDriven,
} from "../../../prisma/zod";
import {trpc} from "../../utils/trpc";
import {useRouter} from "next/router";
import GenericForm from "../../elements/GenericForm";
import {toast} from "react-toastify";
import {confirmAlert} from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type TrucksType = z.infer<typeof TrucksModel>;
type DriversType = z.infer<typeof DriversModel>;
import {FormFieldsType, SelectDataType} from "../../utils/types";
import {
    CustomerDeliveryLocations,
    CustomerLoadTypes,
    TrucksDriven,
} from "@prisma/client";
import {formatDateToWeek} from "../../utils/UtilityFunctions";
import $ from "jquery";
import Button from "@mui/material/Button";
import NextLink from "next/link";

const today = new Date();
const defaultWeek = formatDateToWeek(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));

const defaultValues = {
    StartDate: undefined,
    Created: new Date(),
    Week: defaultWeek,
    CustomerID: undefined,
    LoadTypeID: null,
    DeliveryDescriptionID: null,
    DriverID: null,
    TruckID: null,
    Hours: undefined,
    TotalAmount: undefined,
    TotalRate: undefined,
    TruckRate: undefined,
    DriverRate: undefined,
    Weight: undefined,
    MaterialRate: undefined,
    TicketNumber: undefined,
    onReset: false,
};

function PartialLoad({
                         customers,
                         loadTypes,
                         deliveryLocations,
                         trucks,
                         drivers,
                         initialLoad = null,
                         refreshData,
                         resetButton = false,
                         selectedLoads = []
                     }: {
    customers: CustomersType[];
    loadTypes: LoadTypesType[];
    deliveryLocations: DeliveryLocationsType[];
    trucks: TrucksType[];
    drivers: DriversType[];
    initialLoad?: null | LoadsType;
    refreshData?: any;
    resetButton?: any;
    selectedLoads?: any[] | undefined;
}) {
    function useForceUpdate() {
        const [value, setValue] = useState(0); // integer state
        return () => setValue((value) => value + 1); // update state to force render
    }

    const forceUpdate = useForceUpdate();

    const router = useRouter();

    const validationSchema = initialLoad
        ? LoadsModel
        : LoadsModel.omit({ID: true});

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {
        handleSubmit,
        formState: {errors},
        control,
        resetField,
        reset,
        watch,
        setValue
    } = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialLoad ?? defaultValues,
    });

    console.log('ERRORSW', errors)

    const doMassEdit = trpc.useMutation('loads.post_mass_edit', {
        async onSuccess() {
            toast("Successfully Submitted!", {autoClose: 2000, type: "success"});
        },
        async onError(error) {
            toast(
                "There was an issue creating or updating this load. The issue was: " +
                error.message,
                {autoClose: 1000000, type: "error"}
            );
            return;
        },
    });

    const onSubmit = async (data: ValidationSchema) => {
        const fieldsToValidate = [
            {key: "CustomerID", name: "Customer ID"},
            {key: "DriverID", name: "Driver ID"},
            {key: "TruckID", name: "Truck ID"},
            {key: "LoadTypeID", name: "Load Type ID"},
            {key: "DeliveryLocationID", name: "Delivery Location ID"},
            {key: "StartDate", name: "Start Date"},
            {key: "Week", name: "Week"},
            {key: "MaterialRate", name: "Material Rate"},
            {key: "TruckRate", name: "Truck Rate"},
            {key: "DriverRate", name: "Driver Rate"},
            {key: "TotalRate", name: "Total Rate"},
        ];

        // Validate fields
        for (const field of fieldsToValidate) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (!data[field.key]) {
                toast(`Missing ${field.name}`, {
                    autoClose: 100000,
                    type: "error",
                });
                return; // Stop execution if a required field is missing
            }
        }


        confirmAlert({
            overlayClassName: "custom-overlay-style",
            title: "Confirm Mass Edit",
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            message: (<>
                <p>Are you sure you want to change the following ticket numbers to match the form on the right?</p>
                <p><b>Ticket Numbers:</b> {selectedLoads.map((record) => record.TicketNumber).join(', ')}</p>
                <p>If any of these are incorrect, please close this and remove the incorrect tickets.</p>
                <p style={{color: 'red', fontWeight: 'bold'}}>ALL FIELDS SHOWN WILL BE CHANGED!</p>
            </>),
            buttons: [
                {
                    label: "Do Mass Edit",
                    onClick: async () => {
                        toast("Submitting...", {autoClose: 2000, type: "info"});
                        await doMassEdit.mutateAsync({
                            selectedLoads: selectedLoads.map((record) => record.ID) ?? [],
                            data
                        });
                        refreshData()
                    },
                },
                {
                    label: "Close",
                    //onClick: () => {}
                },
            ],
        });
        const style = document.createElement('style');
        style.innerHTML = `
    .custom-overlay-style {
        background: rgba(0, 0, 0, 0.5) !important;
    }
`;
        document.head.appendChild(style);
    };

    const [customer, setCustomer] = useState(
        initialLoad ? (initialLoad.CustomerID ? initialLoad.CustomerID : 0) : 0
    );

    const [driver, setDriver] = useState(
        initialLoad ? (initialLoad.DriverID ? initialLoad.DriverID : 0) : 0
    );

    const [truck, setTruck] = useState(
        initialLoad ? (initialLoad.TruckID ? initialLoad.TruckID : 0) : 0
    );

    const [lttrpcData, ltsetData] = useState<CustomerLoadTypes[]>([]);

    const [dltrpcData, dlsetData] = useState<CustomerDeliveryLocations[]>([]);

    const [tdtrpcData, tdsetData] = useState<CompleteTrucksDriven[]>([]);

    const [ltshouldRefresh, ltsetShouldRefresh] = useState(false);

    const [dlshouldRefresh, dlsetShouldRefresh] = useState(false);

    const [tdshouldRefresh, tdsetShouldRefresh] = useState(false);

    trpc.useQuery(["loadtypes.search", {CustomerID: customer}], {
        enabled: ltshouldRefresh,
        onSuccess(data) {
            ltsetData(JSON.parse(JSON.stringify(data)));
            ltsetShouldRefresh(false);
            //forceUpdate;
        },
        onError(error) {
            console.warn(error.message);
            ltsetShouldRefresh(false);
        },
    });

    trpc.useQuery(["deliverylocations.search", {CustomerID: customer}], {
        enabled: dlshouldRefresh,
        onSuccess(data) {
            dlsetData(JSON.parse(JSON.stringify(data)));
            dlsetShouldRefresh(false);
            //forceUpdate;
        },
        onError(error) {
            console.warn(error.message);
            dlsetShouldRefresh(false);
        },
    });

    trpc.useQuery(["trucksdriven.search", {TruckID: truck, DriverID: driver}], {
        enabled: tdshouldRefresh,
        onSuccess(data) {
            tdsetData(JSON.parse(JSON.stringify(data)));
            tdsetShouldRefresh(false);
            //forceUpdate;
        },
        onError(error) {
            console.warn(error.message);
            tdsetShouldRefresh(false);
        },
    });

    React.useEffect(() => {
        const subscription = watch((value, {name, type}) => {
            if (name === "StartDate" && type === "change") {
                setValue("Week", formatDateToWeek(value.StartDate ? value.StartDate : new Date()))
            }
            if (
                ["MaterialRate", "TruckRate"].includes(name ?? "") &&
                type === "change"
            ) {
                const hours = value.Hours ?? 0;
                const weight = value.Weight ?? 0;
                let totalRate = value.TotalRate;
                setValue(
                    "TotalRate",
                    Math.round(
                        ((value.MaterialRate ?? 0) + (value.TruckRate ?? 0)) * 100
                    ) / 100
                );
                totalRate = (value.MaterialRate ?? 0) + (value.TruckRate ?? 0);
            }

            if (name === "TruckRate") {
                setValue("DriverRate", value.TruckRate ?? 0)
            }

            if (name === "TotalRate") {
                const hours = value.Hours ?? 0;
                const weight = value.Weight ?? 0;
            }
            if (name === "CustomerID" && type === "change") {
                setCustomer(value.CustomerID ?? 0);
                dlsetShouldRefresh(true);
                ltsetShouldRefresh(true);
            }
            if ((name === "TruckID" || name === "DriverID") && type === "change") {
                if (name === "TruckID") {
                    //setValue("DriverID", 0)
                    //setDriver(0)
                    setTruck(value.TruckID ?? 0);
                } else {
                    //setValue("TruckID", 0)
                    setDriver(value.DriverID ?? 0);
                    //setTruck(0)
                }
                if (value.TruckID || value.DriverID) {
                    tdsetShouldRefresh(true);
                } else {
                    tdsetData([]);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [watch]);

    //const fetchCustomerLoadTypes = trpc.useQuery(['customerloadtypes.getAll', {CustomerID: watchCustomerSelected ?? 0}])

    const watchHours = watch("Hours");
    const watchWeight = watch("Weight");

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
            name: "CustomerID",
            size: 12,
            required: true,
            shouldErrorOn: ["invalid_type"],
            errorMessage: "Customer is required.",
            type: "select",
            label: "Customer",
            searchQuery: "customers",
        },
        {
            name: "DriverID",
            size: 6,
            required: false,
            type: "select",
            label: "Driver",
            searchQuery: "drivers",
            groupBy: "Recommend",
            groupByNames: "Has Driven Truck|New for Driver",
        },
        {
            name: "TruckID",
            size: 6,
            required: false,
            type: "select",
            label: "Truck",
            searchQuery: "trucks",
            groupBy: "Recommend",
            groupByNames: "Driven Before|New for Driver",
        },
        {
            name: "LoadTypeID",
            size: 6,
            required: true,
            shouldErrorOn: ["invalid_type"],
            errorMessage: "Load type is required.",
            type: "select",
            label: "Load Type",
            searchQuery: "loadtypes",
            groupBy: "Recommend",
            groupByNames: "Used by Customer|New for Customer",
        },
        {
            name: "DeliveryLocationID",
            size: 6,
            required: false,
            type: "select",
            label: "Delivery Location",
            searchQuery: "deliverylocations",
            groupBy: "Recommend",
            groupByNames: "Used by Customer|New for Customer",
        },
        {
            name: "StartDate",
            size: 6,
            required: false,
            type: "date",
            label: "Delivered On",
        },
        {
            name: "Week",
            size: 6,
            required: false,
            type: "week",
            label: "Daily Week",
        },
        {
            name: "MaterialRate",
            required: false,
            type: "textfield",
            size: 6,
            number: true,
            label: "Material Rate",
        },
        {
            name: "TruckRate",
            required: false,
            type: "textfield",
            size: 6,
            number: true,
            label: "Truck Rate",
        },
        {
            name: "DriverRate",
            required: false,
            type: "textfield",
            size: 6,
            number: true,
            label: "Driver Rate",
        },
        {
            name: "TotalRate",
            required: false,
            type: "textfield",
            size: 6,
            number: true,
            label: "Company Rate",
        }
    ];

    const selectData: SelectDataType = [
        {
            key: "CustomerID",
            data: customers,
            optionValue: "ID",
            optionLabel: "Name+|+Street+,+City",
            defaultValue: initialLoad ? initialLoad.CustomerID : null,
        },
        {
            key: "LoadTypeID",
            data: lttrpcData.length > 0 ? lttrpcData : loadTypes,
            optionValue: "ID",
            optionLabel: "Description",
            defaultValue: initialLoad ? initialLoad.LoadTypeID : null,
        },
        {
            key: "DeliveryLocationID",
            data: dltrpcData.length > 0 ? dltrpcData : deliveryLocations,
            optionValue: "ID",
            optionLabel: "Description",
            defaultValue: initialLoad ? initialLoad.DeliveryLocationID : null,
        },
        {
            key: "TruckID",
            data:
                tdtrpcData.length > 0
                    ? tdtrpcData
                        .map((item) => item.Trucks)
                        .filter((item) => item !== undefined)
                        .filter((value, index, self) => {
                            return index === self.findIndex((t) => t.ID === value.ID);
                        })
                    : trucks,
            optionValue: "ID",
            optionLabel: "Name+|+Notes",
            defaultValue: initialLoad ? initialLoad.TruckID : null,
        },
        {
            key: "DriverID",
            data:
                tdtrpcData.length > 0
                    ? tdtrpcData
                        .map((item) => item.Drivers)
                        .filter((item) => item !== undefined)
                        .filter((value, index, self) => {
                            return index === self.findIndex((t) => t.ID === value.ID);
                        })
                    : drivers,
            optionValue: "ID",
            optionLabel: "FirstName+LastName",
            defaultValue: initialLoad ? initialLoad.DriverID : null,
        },
    ];


    return (
        <>
            <Box
                component="form"
                autoComplete="off"
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                sx={{
                    paddingLeft: 2.5,
                }}
            >
                <GenericForm
                    errors={errors}
                    control={control}
                    fields={fields}
                    selectData={selectData}
                    selectedCustomer={customer}
                    onReset={
                        resetButton
                            ? () => {
                                reset(defaultValues);
                            }
                            : null
                    }
                />
            </Box>
        </>
    );

}

export default PartialLoad;
