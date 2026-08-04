import React, {useState} from "react";
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {
    CustomersModel,
    InvoicesModel,
    LoadsModel,
    LoadTypesModel,
    DeliveryLocationsModel,
    DriversModel,
} from "../../../prisma/zod";
import {trpc} from "../../utils/trpc";
import {useRouter} from "next/router";
import GenericForm from "../../elements/GenericForm";
import {toast} from "react-toastify";
import {confirmAlert} from "../../utils/appConfirm";
import {showLoadWarnings} from "../../utils/loadWarningToasts";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type DriversType = z.infer<typeof DriversModel>;
import {FormFieldsType, SelectDataType} from "../../utils/types";
import {
    CustomerDeliveryLocations,
    CustomerLoadTypes,
} from "@prisma/client";
import {formatDateToWeek} from "../../utils/UtilityFunctions";
import {useSourcesCutover} from "../../hooks/useSourcesCutover";
import $ from "jquery";
import Button from "@mui/material/Button";
import NextLink from "next/link";

const today = new Date();
const defaultWeek = formatDateToWeek(today);

const defaultValues = {
    StartDate: undefined,
    Created: new Date(),
    Week: defaultWeek,
    CustomerID: undefined,
    LoadTypeID: null,
    DeliveryDescriptionID: null,
    DriverID: null,
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
                         initialLoad = null,
                         jobId = null,
                         refreshData,
                         resetButton = false,
                         selectedLoads = []
                     }: {
    initialLoad?: null | LoadsType;
    jobId?: number | null;
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
    const {active: cutoverActive} = useSourcesCutover();

    const validationSchema = initialLoad
        ? LoadsModel.extend({SourceID: z.number().int().nullish()})
        : LoadsModel.omit({ID: true}).extend({SourceID: z.number().int().nullish()});

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

    const doMassEdit = trpc.useMutation('loads.post_mass_edit', {
        async onSuccess(result) {
            const showedWarning = showLoadWarnings(result?.warnings);
            if (!showedWarning) {
                toast("Successfully Submitted!", {autoClose: 2000, type: "success"});
            }
            refreshData?.();
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
            {key: "LoadTypeID", name: "Load Type ID"},
            {key: "DeliveryLocationID", name: "Delivery Location ID"},
            {key: "Week", name: "Week"},
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

        if (doMassEdit.isLoading) return;

        confirmAlert({
            overlayClassName: "custom-overlay-style",
            title: "Confirm Mass Edit",
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            message: (<>
                <p>
                    Apply identity, rates, and week from this form to{" "}
                    <b>{selectedLoads.length}</b> load{selectedLoads.length === 1 ? "" : "s"} on job{" "}
                    <b>#{jobId ?? initialLoad?.JobID ?? "?"}</b>?
                </p>
                <p><b>Ticket numbers:</b> {selectedLoads.map((record) => record.TicketNumber).join(", ")}</p>
                <p>
                    Ticket number, weight, hours, amount, start date, and truck stay unchanged on each load.
                    Remove incorrect tickets from the table before confirming.
                </p>
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
                    },
                },
                {
                    label: "Close",
                    className: "rca-btn-cancel",
                    onClick: () => undefined,
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

    const [loadTypeSelected, setLoadTypeSelected] = useState(
        initialLoad ? (initialLoad.LoadTypeID ? initialLoad.LoadTypeID : 0) : 0
    );

    const [source, setSource] = useState(
        initialLoad && "SourceID" in initialLoad
            ? ((initialLoad as {SourceID?: number | null}).SourceID ?? 0)
            : 0,
    );

    const [srctrpcData, srcsetData] = useState<Record<string, unknown>[]>([]);

    const [lttrpcData, ltsetData] = useState<CustomerLoadTypes[]>([]);

    const [dltrpcData, dlsetData] = useState<CustomerDeliveryLocations[]>([]);

    const [ltshouldRefresh, ltsetShouldRefresh] = useState(false);

    const [dlshouldRefresh, dlsetShouldRefresh] = useState(false);

    const [srcshouldRefresh, srcsetShouldRefresh] = useState(false);

    trpc.useQuery(["loadtypes.search", {CustomerID: customer, era: cutoverActive ? "new" : undefined}], {
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

    trpc.useQuery(["sources.search", {LoadTypeID: loadTypeSelected || undefined}], {
        enabled: cutoverActive && srcshouldRefresh && loadTypeSelected > 0,
        onSuccess(data) {
            srcsetData(JSON.parse(JSON.stringify(data)));
            srcsetShouldRefresh(false);
        },
        onError(error) {
            console.warn(error.message);
            srcsetShouldRefresh(false);
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
            if (name === "LoadTypeID" && type === "change") {
                setLoadTypeSelected(value.LoadTypeID ?? 0);
                srcsetShouldRefresh(true);
            }
            if (name === "DriverID" && type === "change") {
                setDriver(value.DriverID ?? 0);
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
            size: 12,
            required: false,
            type: "select",
            label: "Driver",
            searchQuery: "drivers",
            onlyActive: true,
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
            groupByNames: "Customer=Used by Customer|Source=Linked to Source|Other",
            enableOptionGroups: customer > 0,
        },
        ...(cutoverActive
            ? [{
                name: "SourceID",
                size: 6,
                required: false,
                type: "select" as const,
                label: "Source",
                searchQuery: "sources",
                groupBy: "Recommend",
                groupByNames: "Associated=Associated|Not Associated",
                enableOptionGroups: loadTypeSelected > 0,
            }]
            : []),
        {
            name: "DeliveryLocationID",
            size: 6,
            required: false,
            type: "select",
            label: "Delivery Location",
            searchQuery: "deliverylocations",
            groupBy: "Group",
            groupByNames: "Customer=Used by Customer|Other=New for Customer",
            enableOptionGroups: customer > 0,
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
            data: [],
            optionValue: "ID",
            optionLabel: "Name+|+Street+,+City",
            defaultValue: initialLoad ? initialLoad.CustomerID : null,
        },
        {
            key: "LoadTypeID",
            data: lttrpcData.length > 0 ? lttrpcData : [],
            optionValue: "ID",
            optionLabel: "Description",
            defaultValue: initialLoad ? initialLoad.LoadTypeID : null,
        },
        ...(cutoverActive
            ? [{
                key: "SourceID",
                data: srctrpcData,
                optionValue: "ID",
                optionLabel: "Name",
                defaultValue:
                    initialLoad && "SourceID" in initialLoad
                        ? ((initialLoad as {SourceID?: number | null}).SourceID ?? null)
                        : null,
            }]
            : []),
        {
            key: "DeliveryLocationID",
            data: dltrpcData.length > 0 ? dltrpcData : [],
            optionValue: "ID",
            optionLabel: "Description",
            defaultValue: initialLoad ? initialLoad.DeliveryLocationID : null,
        },
        {
            key: "DriverID",
            data: [],
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
                    selectedLoadType={loadTypeSelected}
                    selectedDriver={driver}
                    loadTypeEra={cutoverActive ? "new" : undefined}
                    submitDisabled={doMassEdit.isLoading}
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
