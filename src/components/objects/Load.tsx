import React, {useRef, useState, useMemo} from "react";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
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
} from "../../../prisma/zod";
import {trpc} from "../../utils/trpc";
import {useRouter} from "next/router";
import GenericForm from "../../elements/GenericForm";
import {toast} from "react-toastify";
import {confirmDestructive} from "../../utils/appConfirm";
import {showLoadWarnings} from "../../utils/loadWarningToasts";

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
import {useSourcesCutover} from "../../hooks/useSourcesCutover";

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
    )
        .extend({SourceID: z.number().int().nullish()})
        .superRefine((data, ctx) => {
            if (!data.StartDate || Number.isNaN(new Date(data.StartDate).getTime())) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Delivered On is required.",
                    path: ["StartDate"],
                });
            }
            if (data.TicketNumber > 2_147_483_647) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Ticket number is too large (max 2,147,483,647).",
                    path: ["TicketNumber"],
                });
            }
        });

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
            toggleOverride(false);
            const showedWarning = showLoadWarnings(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                object?.warnings,
            );
            if (!showedWarning) {
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
        if (fieldName === "CustomerID") {
            setCustomer(id);
            dlsetShouldRefresh(true);
            ltsetShouldRefresh(true);
        } else if (fieldName === "SourceID") {
            setSource(id);
            ltsetShouldRefresh(true);
        } else if (fieldName === "LoadTypeID") {
            setLoadTypeSelected(id);
            srcsetShouldRefresh(true);
        } else if (fieldName === "DeliveryLocationID") {
            dlsetShouldRefresh(true);
        } else if (fieldName === "DriverID") {
            setDriver(id);
        } else if (fieldName === "TruckID") {
            setTruck(id);
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

    const [source, setSource] = useState(
        initialLoad && (initialLoad as {SourceID?: number}).SourceID
            ? (initialLoad as {SourceID?: number}).SourceID!
            : 0
    );

    const [forceNewWork, setForceNewWork] = useState(false);
    const [activeOpenJobId, setActiveOpenJobId] = useState<number | null>(null);
    const [weekFilterActive, setWeekFilterActive] = useState(() => Boolean(initialLoad?.Week));
    const {active: cutoverActive, configMismatch} = useSourcesCutover();

    const [loadTypeSelected, setLoadTypeSelected] = useState(
        initialLoad ? (initialLoad.LoadTypeID ? initialLoad.LoadTypeID : 0) : 0
    );

    const [lttrpcData, ltsetData] = useState<any[]>([]);

    const [dltrpcData, dlsetData] = useState<CustomerDeliveryLocations[]>([]);

    const [srctrpcData, srcsetData] = useState<any[]>([]);

    const [ltshouldRefresh, ltsetShouldRefresh] = useState(false);

    const [dlshouldRefresh, dlsetShouldRefresh] = useState(false);

    const [srcshouldRefresh, srcsetShouldRefresh] = useState(false);

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

    const watchWeek = watch("Week");
    const watchDriverID = watch("DriverID");
    const watchDeliveryLocationID = watch("DeliveryLocationID");

    const isEditingExistingLoad = Boolean(initialLoad?.ID);

    const openJobsQuery = trpc.useQuery(
        [
            "loads.openLegacyJobs",
            {
                ...(customer > 0 ? {CustomerID: customer} : {}),
                ...(watchDriverID ? {DriverID: watchDriverID} : {}),
                ...(weekFilterActive && watchWeek ? {Week: watchWeek} : {}),
            },
        ],
        {
            enabled:
                cutoverActive &&
                !forceNewWork &&
                !isEditingExistingLoad &&
                (customer > 0 || Boolean(watchDriverID)),
        },
    );

    const openJobs = openJobsQuery.data ?? [];
    const showOpenJobsTable =
        cutoverActive &&
        !forceNewWork &&
        !isEditingExistingLoad &&
        (customer > 0 || Boolean(watchDriverID));
    const legacyCriteriaMet =
        Boolean(watchDriverID) && weekFilterActive && Boolean(watchWeek);
    const showLegacyPath =
        cutoverActive && !forceNewWork && legacyCriteriaMet && openJobs.length > 0;
    const activeOpenJob = useMemo(
        () => openJobs.find((job) => job.JobID === activeOpenJobId) ?? null,
        [openJobs, activeOpenJobId],
    );
    const openJobLoadTypeIDs = useMemo(
        () => (showLegacyPath ? openJobs.map((job) => job.LoadTypeID) : []),
        [openJobs, showLegacyPath],
    );
    const showSourceField = cutoverActive && !showLegacyPath;
    const loadTypeEra: "legacy" | "new" | undefined = cutoverActive
        ? showLegacyPath
            ? "legacy"
            : "new"
        : undefined;

    trpc.useQuery(
        [
            "loadtypes.search",
            {
                CustomerID: customer || undefined,
                SourceID: source || undefined,
                era: loadTypeEra,
                OpenJobLoadTypeIDs: openJobLoadTypeIDs.length > 0 ? openJobLoadTypeIDs : undefined,
            },
        ],
        {
            enabled: ltshouldRefresh && !cutoverActive,
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

    React.useEffect(() => {
        const subscription = watch((value, {name, type}) => {
            if (name === "TicketNumber" && type === "change") {
                toggleOverride(false)
            }
            if (name === "StartDate" && type === "change") {
                setWeekFilterActive(true);
                setValue("Week", formatDateToWeek(value.StartDate ? value.StartDate : new Date()))
            }
            if (name === "Week" && type === "change") {
                setWeekFilterActive(true);
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
            if (name === "DriverID" && type === "change") {
                setForceNewWork(false);
            }
            if (name === "Week" && type === "change") {
                setForceNewWork(false);
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
            }
        });

        return () => subscription.unsubscribe();
    }, [watch]);

    //const fetchCustomerLoadTypes = trpc.useQuery(['customerloadtypes.getAll', {CustomerID: watchCustomerSelected ?? 0}])

    const watchHours = watch("Hours");
    const watchWeight = watch("Weight");

    const prefillOpenJob = (job: (typeof openJobs)[number]) => {
        setActiveOpenJobId(job.JobID);
        setValue("CustomerID", job.CustomerID);
        setCustomer(job.CustomerID);
        setValue("LoadTypeID", job.LoadTypeID);
        setLoadTypeSelected(job.LoadTypeID);
        setValue("DeliveryLocationID", job.DeliveryLocationID);
        setValue("Week", job.Week);
        setWeekFilterActive(true);
        setValue("TruckRate", job.TruckingRate);
        setValue("MaterialRate", job.MaterialRate);
        setValue("DriverRate", job.DriverRate);
        setValue("TotalRate", job.CompanyRate);
        setValue("SourceID", null);
        setSource(0);
        setForceNewWork(false);
        dlsetShouldRefresh(true);
        ltsetShouldRefresh(true);
    };

    const formatOpenJobDate = (value: Date | string | null | undefined) => {
        if (!value) {
            return "—";
        }
        return new Date(value).toLocaleDateString("en-US", {timeZone: "UTC"});
    };

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

    React.useEffect(() => {
        if (activeOpenJobId == null) {
            return;
        }
        // Don't clear mid-refetch: row clicks change the query key (week filter),
        // and data is briefly undefined while the narrowed query loads.
        if (openJobsQuery.isLoading || openJobsQuery.isFetching) {
            return;
        }
        if (!openJobs.some((job) => job.JobID === activeOpenJobId)) {
            setActiveOpenJobId(null);
        }
    }, [openJobs, activeOpenJobId, openJobsQuery.isLoading, openJobsQuery.isFetching]);

    React.useEffect(() => {
        if (!cutoverActive) return;
        ltsetData([]);
    }, [cutoverActive, forceNewWork, openJobLoadTypeIDs.join(","), loadTypeEra]);

    React.useEffect(() => {
        if (!showLegacyPath) return;
        setValue("SourceID", null);
        setSource(0);
    }, [showLegacyPath, setValue]);

    const baseFields: FormFieldsType = useMemo(() => {
        const loadTypeField = {
            name: "LoadTypeID",
            size: showSourceField ? 6 : 6,
            required: true,
            shouldErrorOn: ["invalid_type"],
            errorMessage: "Load type is required.",
            type: "select" as const,
            label: "Load Type",
            searchQuery: "loadtypes",
            groupBy: "Recommend",
            groupByNames: showLegacyPath
                ? "OpenJob=Open Job|Customer=Used by Customer|Source=Linked to Source|Other"
                : "Customer=Used by Customer|Source=Linked to Source|Other",
            enableOptionGroups: customer > 0 || showLegacyPath,
            newOptionLabel: "New Load Type",
            onNewOptionClick: () => setNewObjectModalTarget("LoadTypeID"),
        };

        const sourceField = showSourceField
            ? {
                  name: "SourceID",
                  size: 6,
                  required: false,
                  type: "select" as const,
                  label: "Source",
                  searchQuery: "sources",
                  groupBy: "Recommend",
                  groupByNames: "Associated=Associated|Not Associated",
                  enableOptionGroups: loadTypeSelected > 0,
                  newOptionLabel: "New Source",
                  onNewOptionClick: () => setNewObjectModalTarget("SourceID"),
              }
            : null;

        return [
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
            groupBy: "Group",
            groupByNames: "Truck=Has Driven Truck|Other=New for Driver",
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
            groupBy: "Group",
            groupByNames: "Driver=Driven Before|Other=New for Driver",
            enableOptionGroups: driver > 0,
            newOptionLabel: "New Truck",
            onNewOptionClick: () => setNewObjectModalTarget("TruckID"),
        },
        loadTypeField,
        ...(sourceField ? [sourceField] : []),
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
            newOptionLabel: "New Delivery Location",
            onNewOptionClick: () => setNewObjectModalTarget("DeliveryLocationID"),
        },
        {
            name: "StartDate",
            size: 3,
            required: true,
            shouldErrorOn: ["invalid_type", "invalid_date", "custom"],
            errorMessage: "Delivered On is required.",
            type: "date",
            label: "Delivered On",
        },
        {
            name: "Week",
            size: 3,
            required: false,
            type: "week",
            label: "Daily Week",
        },
        {
            name: "TicketNumber",
            required: true,
            type: "textfield",
            shouldErrorOn: ['invalid_type', 'custom'],
            errorMessage: 'Ticket number is required.',
            size: 12,
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
    }, [showSourceField, showLegacyPath, cutoverActive, customer, loadTypeSelected, truck, driver, initialLoad, watchHours, watchWeight]);

    const fields = useMemo(() => {
        const next = [...baseFields];
        if (initialLoad) {
            next.splice(1, 0, {
                name: "Invoiced",
                size: 2,
                required: false,
                type: "checkbox",
                disabled: true,
            });
        }
        return next;
    }, [baseFields, initialLoad]);

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
            data: [],
            optionValue: "ID",
            optionLabel: "Name",
            defaultValue: inlineDefaultIds.SourceID,
        },
        {
            key: "LoadTypeID",
            // When cutover is on, always let RHAutocomplete fetch with `loadTypeEra`
            // (legacy vs new). Parent-cached rows blocked era updates in the dropdown.
            data: cutoverActive ? [] : lttrpcData.length > 0 ? lttrpcData : [],
            optionValue: "ID",
            optionLabel: "Description",
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
            data: [],
            optionValue: "ID",
            optionLabel: "Name+|+Notes",
            defaultValue: inlineDefaultIds.TruckID,
        },
        {
            key: "DriverID",
            data: [],
            optionValue: "ID",
            optionLabel: "FirstName+LastName",
            defaultValue: inlineDefaultIds.DriverID,
        },
    ];


    return (
        <>
            <Box
                component="form"
                data-testid="load-form"
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
                    loadTypeEra={loadTypeEra}
                    openJobLoadTypeIDs={openJobLoadTypeIDs}
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
                {configMismatch ? (
                    <Alert severity="warning" sx={{mt: 2}}>
                        Cutover UI is forced on the client (
                        <code>NEXT_PUBLIC_SOURCES_CUTOVER_FORCE</code>) but the server does not have
                        cutover active. Set <code>SOURCES_CUTOVER_FORCE=true</code> in{" "}
                        <code>.env</code> and restart the dev server so open-job detection and
                        new-era load types work.
                    </Alert>
                ) : null}
                {showOpenJobsTable ? (
                    <>
                        <Alert severity="info" sx={{mt: 2}}>
                            {openJobsQuery.isLoading ? (
                                "Loading open legacy jobs…"
                            ) : openJobs.length > 0 ? (
                                <>
                                    {openJobs.length} open legacy job
                                    {openJobs.length === 1 ? "" : "s"} (not paid out and weekly not invoiced) matching your selections
                                    {weekFilterActive ? "" : " (daily week not applied yet)"}.
                                    {" "}
                                    <strong>Click a row</strong> to fill the form and attach this
                                    ticket to that job (Source field hidden).
                                    {activeOpenJob ? (
                                        <>
                                            {" "}
                                            <strong>Active:</strong> {activeOpenJob.CustomerName} —{" "}
                                            {activeOpenJob.LoadTypeDescription} ({activeOpenJob.Week}).
                                        </>
                                    ) : null}{" "}
                                    {openJobs.length > 0 ? (
                                        <>
                                            <Link
                                                component="button"
                                                type="button"
                                                onClick={() => {
                                                    setActiveOpenJobId(null);
                                                    setForceNewWork(true);
                                                    setValue("SourceID", null);
                                                    setSource(0);
                                                    ltsetShouldRefresh(true);
                                                }}
                                            >
                                                New work instead
                                            </Link>{" "}
                                            starts a brand-new job with Source and clean load types.
                                        </>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    No open legacy jobs match your current selections
                                    {legacyCriteriaMet ? " for this driver and week" : ""}
                                    {customer > 0 ? " and customer" : ""}. Narrow or clear filters,
                                    or use Source and clean load types.
                                </>
                            )}
                        </Alert>
                        {openJobs.length > 0 ? (
                            <Table size="small" sx={{mt: 1}}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={88} />
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Load Type</TableCell>
                                        <TableCell>Location</TableCell>
                                        <TableCell>Week</TableCell>
                                        <TableCell>Last Ticket</TableCell>
                                        <TableCell>Company Rate</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {openJobs.map((job) => {
                                        const isActive = activeOpenJobId === job.JobID;
                                        return (
                                        <TableRow
                                            key={job.JobID}
                                            hover={!isActive}
                                            selected={isActive}
                                            sx={{
                                                cursor: "pointer",
                                                ...(isActive
                                                    ? {
                                                          "&.Mui-selected": {
                                                              backgroundColor: "primary.light",
                                                          },
                                                          "&.Mui-selected:hover": {
                                                              backgroundColor: "primary.light",
                                                          },
                                                      }
                                                    : {}),
                                            }}
                                            onClick={() => prefillOpenJob(job)}
                                            aria-selected={isActive}
                                        >
                                            <TableCell padding="checkbox">
                                                {isActive ? (
                                                    <Chip
                                                        label="Active"
                                                        size="small"
                                                        color="primary"
                                                        sx={{fontWeight: 600}}
                                                    />
                                                ) : null}
                                            </TableCell>
                                            <TableCell>{job.CustomerName}</TableCell>
                                            <TableCell>{job.LoadTypeDescription}</TableCell>
                                            <TableCell>{job.DeliveryLocationDescription}</TableCell>
                                            <TableCell>{job.Week}</TableCell>
                                            <TableCell>{formatOpenJobDate(job.LastStartDate)}</TableCell>
                                            <TableCell>{job.CompanyRate}</TableCell>
                                        </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : null}
                    </>
                ) : null}
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


export default Load;
