import React, {useRef, useState} from "react";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Typography from "@mui/material/Typography";
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
    SourcesModel,
    CompleteTrucksDriven,
} from "../../../prisma/zod";
import {trpc} from "../../utils/trpc";
import {useRouter} from "next/router";
import GenericForm from "../../elements/GenericForm";
import {toast} from "react-toastify";
import {confirmDestructive} from "../../utils/appConfirm";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type TrucksType = z.infer<typeof TrucksModel>;
type DriversType = z.infer<typeof DriversModel>;
type SourcesType = z.infer<typeof SourcesModel>;
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
import Customer from "./Customer";
import Driver from "./Driver";
import Truck from "./Truck";
import LoadType from "./LoadType";
import DeliveryLocation from "./DeliveryLocation";
import Source from "./Source";

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
    SourceID: null,
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

type InlineCreatableField =
    | "CustomerID"
    | "DriverID"
    | "TruckID"
    | "LoadTypeID"
    | "DeliveryLocationID"
    | "SourceID";

const createModalStyle = {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: {xs: "95vw", md: 900},
    maxHeight: "90vh",
    overflowY: "auto",
    bgcolor: "background.paper",
    borderRadius: 1,
    boxShadow: 24,
    p: 2,
};

function Load({
                  initialLoad = null,
                  refreshData,
                  resetButton = false,
              }: {
    customers?: CustomersType[];
    loadTypes?: LoadTypesType[];
    deliveryLocations?: DeliveryLocationsType[];
    trucks?: TrucksType[];
    drivers?: DriversType[];
    sources?: SourcesType[];
    initialLoad?: null | LoadsType;
    refreshData?: any;
    resetButton?: any;
}) {
    function useForceUpdate() {
        const [value, setValue] = useState(0); // integer state
        return () => setValue((value) => value + 1); // update state to force render
    }

    const forceUpdate = useForceUpdate();

    const router = useRouter();

    const validationSchema = (initialLoad
        ? LoadsModel
        : LoadsModel.omit({ID: true})
    ).extend({SourceID: z.number().int().nullish()});

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {
        handleSubmit,
        formState: {errors, isSubmitting},
        control,
        resetField,
        reset,
        watch,
        setValue
    } = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialLoad ?? defaultValues,
    });
    const key = initialLoad ? "loads.post" : "loads.put";

    const addOrUpdateLoad = trpc.useMutation(key, {
        async onSuccess(object) {
            let shouldToast = true;
            toggleOverride(false)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (object.warnings?.length > 0 && object.warnings?.includes("This daily has already been printed.")) {
                shouldToast = false;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const warningIndex = object.warnings.findIndex((item) => item === "This daily has already been printed.")
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const weekID = object.warnings[warningIndex + 1];
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const driverID = object.warnings[warningIndex + 2];
                toast(<DailyPrintedCustomToast Week={weekID} DriverID={driverID}/>, {
                    autoClose: 500000, type: "warning", position: "top-left",
                    style: {
                        width: "98vw",       // Full viewport width
                        margin: 0,            // Remove margin to avoid cut-off
                        borderRadius: 0,      // Remove border-radius for full-width look
                        textAlign: 'center',  // Center the text
                    },
                })
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
            } if (object.warnings?.length > 0 && object.warnings?.includes("This weekly has already been printed.")) {
                shouldToast = false;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const warningIndex = object.warnings.findIndex((item) => item === "This weekly has already been printed.")
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const weekID = object.warnings[warningIndex + 1];
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const customerID = object.warnings[warningIndex + 2];
                toast(<DailyPrintedCustomToast Week={weekID} CustomerID={customerID}/>, {
                    autoClose: 500000, type: "warning", position: "top-left",
                    style: {
                        width: "98vw",       // Full viewport width
                        margin: 0,            // Remove margin to avoid cut-off
                        borderRadius: 0,      // Remove border-radius for full-width look
                        textAlign: 'center',  // Center the text
                    },
                })
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
            } if (object.warnings?.length > 0 && object.warnings?.includes("This load matches a closed/paid out job. A new job has been made, please close the job/weekly if there are no other tickets for this job so it can be invoiced.")) {
                shouldToast = false;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const warningIndex = object.warnings.findIndex((item) => item === "This load matches a closed/paid out job. A new job has been made, please close the job/weekly if there are no other tickets for this job so it can be invoiced.")
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const weekID = object.warnings[warningIndex + 1];
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const customerID = object.warnings[warningIndex + 2];
                toast(<JobClosedCustomToast Week={weekID} CustomerID={customerID}/>, {
                    autoClose: 500000, type: "warning", position: "top-left",
                    style: {
                        width: "98vw",       // Full viewport width
                        margin: 0,            // Remove margin to avoid cut-off
                        borderRadius: 0,      // Remove border-radius for full-width look
                        textAlign: 'center',  // Center the text
                    },
                })
            }
            if (shouldToast) {
                toast("Successfully Submitted!", {autoClose: 2000, type: "success"});
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            initialLoad && reset(object.data);
        },
        async onError(error) {
            toggleOverride(false)
            toast(
                "There was an issue creating or updating this load. The issue was: " +
                error.message,
                {autoClose: 1000000, type: "error"}
            );
            return;
        },
    });

    const checkDuplicate = trpc.useMutation((initialLoad ? 'loads.post_duplicate_checker' : 'loads.put_duplicate_checker'), {
        async onSuccess(data) {
            return data;
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

    const [overrideWarning, toggleOverride] = useState(false);
    const [newObjectModalTarget, setNewObjectModalTarget] =
        useState<InlineCreatableField | null>(null);
    const [inlineDefaultIds, setInlineDefaultIds] = useState<Record<InlineCreatableField, number | null>>({
        CustomerID: initialLoad?.CustomerID ?? null,
        DriverID: initialLoad?.DriverID ?? null,
        TruckID: initialLoad?.TruckID ?? null,
        LoadTypeID: initialLoad?.LoadTypeID ?? null,
        DeliveryLocationID: initialLoad?.DeliveryLocationID ?? null,
        SourceID:
            initialLoad && "SourceID" in initialLoad
                ? ((initialLoad as LoadsType & {SourceID?: number | null}).SourceID ?? null)
                : null,
    });
    /** Prevents double submits while duplicate check or save is in flight. */
    const submitLockRef = useRef(false);
    const {data: states = []} = trpc.useQuery(["states.getAll"]);

    const closeNewObjectModal = () => setNewObjectModalTarget(null);

    const onInlineObjectCreated = (fieldName: InlineCreatableField, id: number) => {
        setInlineDefaultIds((prev) => ({...prev, [fieldName]: id}));
        setValue(fieldName, id, {shouldValidate: true, shouldDirty: true, shouldTouch: true});
        if (fieldName === "DeliveryLocationID") {
            dlsetShouldRefresh(true);
        } else if (fieldName === "LoadTypeID") {
            ltsetShouldRefresh(true);
        } else if (fieldName === "DriverID" || fieldName === "TruckID") {
            tdsetShouldRefresh(true);
        } else if (fieldName === "SourceID") {
            srcsetShouldRefresh(true);
        }
        closeNewObjectModal();
    };

    const onSubmit = async (data: ValidationSchema) => {
        if (submitLockRef.current) {
            return;
        }
        submitLockRef.current = true;
        try {
        const duplicate = await checkDuplicate.mutateAsync(data);

        if (duplicate !== false && !overrideWarning) {
            toast(<DuplicateCustomToast ID={duplicate.ID} onClickTrigger={() => toggleOverride(true)}/>, {
                autoClose: 500000, type: "warning", position: "top-left",
                style: {
                    width: "98vw",       // Full viewport width
                    margin: 0,            // Remove margin to avoid cut-off
                    borderRadius: 0,      // Remove border-radius for full-width look
                    textAlign: 'center',  // Center the text
                },
            })
        } else {
            toggleOverride(false)
            toast("Submitting...", {autoClose: 2000, type: "info"});
            await addOrUpdateLoad.mutateAsync(data);
            if (key === "loads.put") {
                resetField("Weight");
                resetField("Hours");
                resetField("TotalAmount");
                resetField("TicketNumber");
                $('[name="TicketNumber"]').focus();
                if (refreshData) {
                    refreshData();
                }
            }
        }
        } finally {
            submitLockRef.current = false;
        }
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

    const [source, setSource] = useState(0);

    const [loadTypeSelected, setLoadTypeSelected] = useState(
        initialLoad ? (initialLoad.LoadTypeID ? initialLoad.LoadTypeID : 0) : 0
    );

    const [lttrpcData, ltsetData] = useState<any[]>([]);

    const [dltrpcData, dlsetData] = useState<CustomerDeliveryLocations[]>([]);

    const [srctrpcData, srcsetData] = useState<any[]>([]);

    const [tdtrpcData, tdsetData] = useState<CompleteTrucksDriven[]>([]);

    const [ltshouldRefresh, ltsetShouldRefresh] = useState(false);

    const [dlshouldRefresh, dlsetShouldRefresh] = useState(false);

    const [srcshouldRefresh, srcsetShouldRefresh] = useState(false);

    const [tdshouldRefresh, tdsetShouldRefresh] = useState(false);

    const deleteLoad = trpc.useMutation("loads.delete", {
        async onSuccess() {
            toast("Successfully Deleted!", {autoClose: 2000, type: "success"});
        },
    });

    const onDelete = async (data: LoadsType) => {
        toggleOverride(false)
        toast("Deleting...", {autoClose: 2000, type: "info"});
        await deleteLoad.mutateAsync(data);
        await router.replace("/loads");
    };

    trpc.useQuery(
        [
            "loadtypes.search",
            {
                CustomerID: customer || undefined,
                SourceID: source || undefined,
            },
        ],
        {
            enabled: ltshouldRefresh,
            onSuccess(data) {
                ltsetData(JSON.parse(JSON.stringify(data)));
                ltsetShouldRefresh(false);
            },
            onError(error) {
                console.warn(error.message);
                ltsetShouldRefresh(false);
            },
        },
    );

    trpc.useQuery(
        [
            "sources.search",
            {
                LoadTypeID: loadTypeSelected || undefined,
            },
        ],
        {
            enabled: srcshouldRefresh,
            onSuccess(data) {
                srcsetData(JSON.parse(JSON.stringify(data)));
                srcsetShouldRefresh(false);
            },
            onError(error) {
                console.warn(error.message);
                srcsetShouldRefresh(false);
            },
        },
    );

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
            if (name === "TicketNumber" && type === "change") {
                toggleOverride(false)
            }
            if (name === "StartDate" && type === "change") {
                setValue("Week", formatDateToWeek(value.StartDate ? value.StartDate : new Date()))
            }
            if (
                ["MaterialRate", "TruckRate", "Hours", "Weight"].includes(name ?? "") &&
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
                setValue(
                    "TotalAmount",
                    Math.round(
                        ((totalRate ?? 0) * (hours > 0 ? hours : weight) + Number.EPSILON) *
                        100
                    ) / 100
                );
            }

            if (name === "TruckRate") {
                setValue("DriverRate", value.TruckRate ?? 0)
            }

            if (name === "TotalRate") {
                const hours = value.Hours ?? 0;
                const weight = value.Weight ?? 0;
                setValue(
                    "TotalAmount",
                    Math.round(
                        ((value.TotalRate ?? 0) * (hours > 0 ? hours : weight) +
                            Number.EPSILON) *
                        100
                    ) / 100
                );
            }
            if (name === "CustomerID" && type === "change") {
                setCustomer(value.CustomerID ?? 0);
                dlsetShouldRefresh(true);
                ltsetShouldRefresh(true);
            }
            if (name === "SourceID" && type === "change") {
                setSource(value.SourceID ?? 0);
                ltsetShouldRefresh(true);
            }
            if (name === "LoadTypeID" && type === "change") {
                setLoadTypeSelected(value.LoadTypeID ?? 0);
                if (!value.SourceID) {
                    srcsetShouldRefresh(true);
                }
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
            size: initialLoad ? 10 : 12,
            required: true,
            shouldErrorOn: ["invalid_type"],
            errorMessage: "Customer is required.",
            type: "select",
            label: "Customer",
            searchQuery: "customers",
            newOptionLabel: "New Customer",
            onNewOptionClick: () => setNewObjectModalTarget("CustomerID"),
        },
        {
            name: "DriverID",
            size: 6,
            required: false,
            type: "select",
            label: "Driver",
            searchQuery: "drivers",
            onlyActive: true,
            groupBy: "Recommend",
            groupByNames: "Has Driven Truck|New for Driver",
            enableOptionGroups: truck > 0,
            newOptionLabel: "New Driver",
            onNewOptionClick: () => setNewObjectModalTarget("DriverID"),
        },
        {
            name: "TruckID",
            size: 6,
            required: false,
            type: "select",
            label: "Truck",
            searchQuery: "trucks",
            onlyActive: true,
            groupBy: "Recommend",
            groupByNames: "Driven Before|New for Driver",
            enableOptionGroups: driver > 0,
            newOptionLabel: "New Truck",
            onNewOptionClick: () => setNewObjectModalTarget("TruckID"),
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
            newOptionLabel: "New Load Type",
            onNewOptionClick: () => setNewObjectModalTarget("LoadTypeID"),
        },
        // Uncomment Source select and keep `newOptionLabel` / `onNewOptionClick` for inline "New Source" creation:
        // {
        //     name: "SourceID",
        //     size: 6,
        //     required: false,
        //     type: "select",
        //     label: "Source (optional)",
        //     searchQuery: "sources",
        //     groupBy: "Recommend",
        //     groupByNames: "Linked=Linked to Load Type|Other",
        //     enableOptionGroups: loadTypeSelected > 0,
        //     newOptionLabel: "New Source",
        //     onNewOptionClick: () => setNewObjectModalTarget("SourceID"),
        // },
        // TODO when above is uncommented need to turn below into size 6
        {
            name: "DeliveryLocationID",
            size: 6,
            required: false,
            type: "select",
            label: "Delivery Location",
            searchQuery: "deliverylocations",
            groupBy: "Recommend",
            groupByNames: "Used by Customer|New for Customer",
            enableOptionGroups: customer > 0,
            newOptionLabel: "New Delivery Location",
            onNewOptionClick: () => setNewObjectModalTarget("DeliveryLocationID"),
        },
        {
            name: "StartDate",
            size: 4,
            required: false,
            type: "date",
            label: "Delivered On",
        },
        {
            name: "Week",
            size: 4,
            required: false,
            type: "week",
            label: "Daily Week",
        },
        {
            name: "TicketNumber",
            required: true,
            type: "textfield",
            shouldErrorOn: ['invalid_type'],
            errorMessage: 'Ticket number is required.',
            size: 4,
            number: true,
            label: "Ticket Number",
        },
        {
            name: "Weight",
            required: false,
            type: "textfield",
            size: 3,
            number: true,
            disabled: !!(watchHours && watchHours > 0),
        },
        {
            name: "Hours",
            required: false,
            type: "textfield",
            size: 3,
            number: true,
            disabled: !!(watchWeight && watchWeight > 0),
        },
        {
            name: "MaterialRate",
            required: false,
            type: "textfield",
            size: 3,
            number: true,
            label: "Material Rate",
        },
        {
            name: "TruckRate",
            required: false,
            type: "textfield",
            size: 3,
            number: true,
            label: "Truck Rate",
        },

        {name: "Received", size: 3, required: false, type: "textfield"},
        {
            name: "DriverRate",
            required: false,
            type: "textfield",
            size: 3,
            number: true,
            label: "Driver Rate",
        },
        {
            name: "TotalRate",
            required: false,
            type: "textfield",
            size: 3,
            number: true,
            label: "Company Rate",
        },
        {
            name: "TotalAmount",
            required: false,
            type: "textfield",
            size: 3,
            number: true,
            label: "Total Amount",
        },
        {
            name: "Notes",
            size: 12,
            required: false,
            type: "textfield",
            multiline: true,
        },
    ];

    if (initialLoad) {
        fields.splice(1, 0, {
            name: "Invoiced",
            size: 2,
            required: false,
            type: "checkbox",
            disabled: true,
        });
    }

    const selectData: SelectDataType = [
        {
            key: "CustomerID",
            data: [],
            optionValue: "ID",
            optionLabel: "Name+|+Street+,+City",
            defaultValue: inlineDefaultIds.CustomerID,
        },
        {
            key: "SourceID",
            data: srctrpcData.length > 0 ? srctrpcData : [],
            optionValue: "ID",
            optionLabel: "Name",
            defaultValue: inlineDefaultIds.SourceID,
        },
        {
            key: "LoadTypeID",
            data: lttrpcData.length > 0 ? lttrpcData : [],
            optionValue: "ID",
            optionLabel: lttrpcData.length > 0 ? "DisplayName" : "Description",
            defaultValue: inlineDefaultIds.LoadTypeID,
        },
        {
            key: "DeliveryLocationID",
            data: dltrpcData.length > 0 ? dltrpcData : [],
            optionValue: "ID",
            optionLabel: "Description",
            defaultValue: inlineDefaultIds.DeliveryLocationID,
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
                    : [],
            optionValue: "ID",
            optionLabel: "Name+|+Notes",
            defaultValue: inlineDefaultIds.TruckID,
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
                    : [],
            optionValue: "ID",
            optionLabel: "FirstName+LastName",
            defaultValue: inlineDefaultIds.DriverID,
        },
    ];


    return (
        <>
            <Box
                component="form"
                autoComplete="off"
                noValidate
                onSubmit={(e) => {
                    // Portaled inline-create forms are still React descendants; in some environments
                    // their submit can surface here. Only run the Load handler for this form's own submit.
                    if (e.target !== e.currentTarget) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    void handleSubmit(onSubmit)(e);
                }}
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
                    selectedSource={source}
                    selectedLoadType={loadTypeSelected}
                    selectedTruck={truck}
                    selectedDriver={driver}
                    submitDisabled={
                        isSubmitting ||
                        addOrUpdateLoad.isLoading ||
                        checkDuplicate.isLoading
                    }
                    deleteDisabled={deleteLoad.isLoading}
                    onReset={
                        resetButton
                            ? () => {
                                reset(defaultValues);
                            }
                            : null
                    }
                    onDelete={
                        initialLoad
                            ? () => {
                                confirmDestructive({
                                    title: "Confirm deletion",
                                    message: "Are you sure you want to delete this load?",
                                    confirmLabel: "Delete",
                                    onConfirm: () => {
                                        void onDelete(initialLoad);
                                    },
                                });
                            }
                            : null
                    }
                />
            </Box>
            <Modal open={newObjectModalTarget !== null} onClose={closeNewObjectModal}>
                <Box sx={createModalStyle} onClick={(e) => e.stopPropagation()}>
                    <Typography variant="h6" sx={{mb: 1}}>
                        {newObjectModalTarget ? `Create ${newObjectModalTarget.replace("ID", "").replace(/([A-Z])/g, " $1").trim()}` : ""}
                    </Typography>
                    {newObjectModalTarget === "CustomerID" && (
                        <Customer
                            states={states}
                            submitLabel="Create"
                            skipRouteRefresh
                            onCreated={(customer) => onInlineObjectCreated("CustomerID", customer.ID)}
                        />
                    )}
                    {newObjectModalTarget === "DriverID" && (
                        <Driver
                            states={states}
                            submitLabel="Create"
                            skipRouteRefresh
                            onCreated={(driverRecord) => onInlineObjectCreated("DriverID", driverRecord.ID)}
                        />
                    )}
                    {newObjectModalTarget === "TruckID" && (
                        <Truck
                            submitLabel="Create"
                            skipRouteRefresh
                            onCreated={(truckRecord) => onInlineObjectCreated("TruckID", truckRecord.ID)}
                        />
                    )}
                    {newObjectModalTarget === "LoadTypeID" && (
                        <LoadType
                            submitLabel="Create"
                            skipRouteRefresh
                            onCreated={(loadTypeRecord) => onInlineObjectCreated("LoadTypeID", loadTypeRecord.ID)}
                        />
                    )}
                    {newObjectModalTarget === "DeliveryLocationID" && (
                        <DeliveryLocation
                            submitLabel="Create"
                            skipRouteRefresh
                            onCreated={(deliveryLocation) =>
                                onInlineObjectCreated("DeliveryLocationID", deliveryLocation.ID)
                            }
                        />
                    )}
                    {newObjectModalTarget === "SourceID" && (
                        <Source
                            submitLabel="Create"
                            skipRouteRefresh
                            onCreated={(sourceRecord) => onInlineObjectCreated("SourceID", sourceRecord.ID)}
                        />
                    )}
                    <Box sx={{display: "flex", justifyContent: "flex-end", mt: 1}}>
                        <Button type="button" variant="outlined" onClick={closeNewObjectModal}>
                            Cancel
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </>
    );
}

interface DuplicateCustomToastProps {
    ID: number,
    onClickTrigger: any,
}

interface DailyPrintedCustomToastProps {
    Week: any,
    DriverID?: any,
    CustomerID?: any
}

class DuplicateCustomToast extends React.Component<DuplicateCustomToastProps> {

    render() {
        return (

            <span>
                This is a duplicate ticket number.&nbsp;
                <a
                    href={`/loads/${this.props.ID}`}
                    target={"_blank"} rel="noreferrer"
                >
                    <b>Click here to open the existing load in a new tab. </b>
                </a>
                If you want to override this warning and make continue with the duplicate ticket number,&nbsp;
                <b onClick={() => this.props.onClickTrigger()}>click here to override this warning. </b>
                Then save this load again. Click anywhere else to dismiss this warning.
              </span>

        )
            ;
    }
}

class JobClosedCustomToast extends React.Component<DailyPrintedCustomToastProps> {
    render() {
        return (

            <span>
                This load was created successfully, however it matches a closed or paid out job. A new job has been made, please remember to close the weekly and invoice this new load.&nbsp;
                <NextLink
                    href={{
                        pathname: "/weeklies",
                        query: {forceExpand: this.props.CustomerID, defaultWeek: this.props.Week}
                    }}
                    passHref
                >
                    <a target={"_blank"}>
                        <b>Click here to open the weekly in a new tab. </b>
                    </a>
                </NextLink>
              </span>

        )
            ;
    }
}

class DailyPrintedCustomToast extends React.Component<DailyPrintedCustomToastProps> {

    render() {
        return (

            <span>
                This load was created successfully, however the {this.props.DriverID ? 'daily' : 'weekly'} it was put on has already been printed.&nbsp;
                <NextLink
                    href={{
                        pathname: this.props.DriverID ? "/dailies" : "/weeklies",
                        query: {forceExpand: this.props.DriverID ?? this.props.CustomerID, defaultWeek: this.props.Week}
                    }}
                    passHref
                >
                    <a target={"_blank"}>
                        <b>Click here to open the {this.props.DriverID ? 'daily' : 'weekly'} in a new tab. </b>
                    </a>
                </NextLink>
              </span>

        )
            ;
    }
}


export default Load;
