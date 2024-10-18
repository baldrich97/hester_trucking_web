import React, {useState} from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {DriversModel, InvoicesModel, LoadsModel, PayStubsModel, CompletePayStubs, JobsModel} from "../../../prisma/zod";
import {trpc} from "../../utils/trpc";
import {useRouter} from "next/router";
import {FormFieldsType, SelectDataType} from "../../utils/types";
import Grid2 from "@mui/material/Unstable_Grid2";
import RHTextfield from "../../elements/RHTextfield";
import RHSelect from "../../elements/RHSelect";
import RHDatePicker from "../../elements/RHDatePicker";
import RHCheckbox from "../../elements/RHCheckbox";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import {toast} from "react-toastify";
import RHAutocomplete from "elements/RHAutocomplete";
import {confirmAlert} from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import PayStubJobs from "../collections/PayStubJobs";

//type PayStubsCompleteType = z.infer<typeof CompletePayStubs>;
type DriversType = z.infer<typeof DriversModel>;
type JobsType = z.infer<typeof JobsModel>;

const defaultValues = {
    Created: new Date(),
    FedTax: 2.757,
    StateTax: 1.655,
    SSTax: 2.500,
    MedTax: 5.123,
    Percentage: 0,
    CheckNumber: '',
};

const PayStub = ({
                     drivers,
                     initialPayStub = null,
                     jobs = []
                 }: {
    drivers: DriversType[];
    initialPayStub?: null | CompletePayStubs;
    refreshData?: any;
    jobs?: [] | JobsType[];
}) => {
    const [driver, setDriver] = useState(0);
    const [shouldFetchJobs, setShouldFetchJobs] = useState(false);
    const [driverJobs, setDriverJobs] = useState<any>([]);
    const [selected, setSelected] = useState<any>(
        !initialPayStub ? [] : jobs?.map((job) => job.ID.toString())
    );
    //this is for forcing it to rerender
    const [_, forceUpdate] = React.useReducer((x) => x + 1, 0);
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const router = useRouter();

    
    
    let validationSchema = initialPayStub
        ? PayStubsModel
        : PayStubsModel.omit({ID: true});

    validationSchema = validationSchema.extend({
        selected: z.array(z.string()),
    });

    type ValidationSchema = z.infer<typeof validationSchema>;

    const {
        handleSubmit,
        formState: {errors},
        control,
        reset,
        watch,
        setValue,
        trigger
    } = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialPayStub ?? defaultValues,
    });

    console.log('ERRORS', errors)

    if (initialPayStub) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setValue("selected", selected);
    }

    const key = initialPayStub ? "paystubs.post" : "paystubs.put";

    const addOrUpdatePayStub = trpc.useMutation(key, {
        async onSuccess(data) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            reset(initialPayStub ? data : defaultValues);
            toast("Successfully Submitted!", {autoClose: 2000, type: "success"});
        },
        async onError(error) {
            toast("There was an issue creating this invoice. The issue was: " + error.message, {
                autoClose: 100000,
                type: "error"
            })
            return;
        }
    });

    trpc.useQuery(["jobs.getByDriver", {driver}], {
        enabled: shouldFetchJobs,
        onSuccess(data) {
            setDriverJobs(data);
            setShouldFetchJobs(false);
            // setValue("TotalAmount", 0);
        },
        onError(error) {
            console.warn(error);
        },
    });

    const onSubmit = async (data: ValidationSchema) => {
        toast("Submitting...", {autoClose: 2000, type: "info"});
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await addOrUpdatePayStub.mutateAsync(data);
        if (key === "paystubs.put") {
            await router.replace(router.asPath);
        }
        setShouldFetchJobs(true);
        //setShouldFetchWeeklies(true);
    };

    // const deleteInvoice = trpc.useMutation("paystubs.delete", {
    //     async onSuccess() {
    //         toast("Successfully Deleted!", {autoClose: 2000, type: "success"});
    //     },
    // });

    const onDelete = async (data: CompletePayStubs) => {
        toast("Deleting...", {autoClose: 2000, type: "info"});
        //await deleteInvoice.mutateAsync(data);
        await router.replace("/paystubs");
    };

    React.useEffect(() => {
        const subscription = watch((value, {name, type}) => {
            if (["DriverID"].includes(name ?? "") && type === "change") {
                const driverID = value.DriverID ?? 0;
                setDriver(driverID);
                setShouldFetchJobs(true)
            }

            if (["Gross", "Percentage"].includes(name ?? "") || (name === "NetTotal" && type === "change")) {
                const nettotal = (name === "NetTotal" && type === "change") ? value.NetTotal ?? 0 : (value.Gross ?? 0) * (value.Percentage ? (value.Percentage / 100) : 1);

                const fedtax = value.FedTax ? nettotal * (value.FedTax / 100) : 0;
                const statetax = value.StateTax ? nettotal * (value.StateTax / 100) : 0;
                const sstax = value.SSTax ? nettotal * (value.SSTax / 100) : 0;
                const medtax = value.MedTax ? nettotal * (value.MedTax / 100) : 0;

                if (name === "NetTotal" && type === "change") {
                    //do nothing
                } else {
                    setValue("NetTotal", nettotal);
                }

                setValue("TakeHome", (Math.round(((nettotal - fedtax - statetax - sstax - medtax) + Number.EPSILON) * 100) / 100), { shouldValidate: true, shouldDirty: true });
            }

            if (["FedTax", "StateTax", "SSTax", "MedTax"].includes(name ?? "")) {
                const nettotal = (value.Gross ?? 0) * (value.Percentage ? (value.Percentage / 100) : 1);

                const fedtax = value.FedTax ? nettotal * (value.FedTax / 100) : 0;
                const statetax = value.StateTax ? nettotal * (value.StateTax / 100) : 0;
                const sstax = value.SSTax ? nettotal * (value.SSTax / 100) : 0;
                const medtax = value.MedTax ? nettotal * (value.MedTax / 100) : 0;

                setValue("TakeHome", (Math.round(((nettotal - fedtax - statetax - sstax - medtax) + Number.EPSILON) * 100) / 100), { shouldValidate: true, shouldDirty: true });
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, setValue, trigger]);

    const fields1: FormFieldsType = //!initialPayStub
        //?
        [
            {
                name: "DriverID",
                size: 7,
                required: true,
                shouldErrorOn: ["invalid_type"],
                errorMessage: "Driver is required.",
                type: "select",
                label: "Driver",
                searchQuery: "drivers",
            },
            {
                name: "Created",
                size: 5,
                required: false,
                type: "date",
                label: 'Invoice Date'
            },
            {
                name: "CheckNumber",
                size: 7,
                required: false,
                type: "textfield",
                label: "Check Number",
            },
            // {
            //     name: "Invoice",
            //     size: 3,
            //     required: false,
            //     type: "date",
            //     label: 'Invoice Date'
            // },
            //TODO ask Shelly about what this is
        ]
        // : [
        //     {
        //         name: "CustomerID",
        //         size: 6,
        //         required: true,
        //         shouldErrorOn: ["invalid_type"],
        //         errorMessage: "Customer is required.",
        //         type: "select",
        //         label: "Customer",
        //         disabled: true,
        //         searchQuery: "customers",
        //     },
        //     {
        //         name: "Consolidated",
        //         size: 2,
        //         required: false,
        //         type: "checkbox",
        //         disabled: true,
        //     },
        //     {
        //         name: "Printed",
        //         size: 2,
        //         required: false,
        //         type: "checkbox",
        //         disabled: true,
        //     },
        //     {
        //         name: "Paid",
        //         size: 1,
        //         required: false,
        //         type: "checkbox",
        //         disabled: true,
        //     },
        //     {
        //         name: "Number",
        //         size: 1,
        //         required: false,
        //         type: "textfield",
        //         number: true,
        //     },
        // ];

    const fields2: FormFieldsType = [{name: "", size: 6, required: false, type: "padding"},
        {
            name: "Gross",
            size: 6,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "Percentage",
            label: "Percentage (eg. 2.75)",
            size: 6,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "NetTotal",
            label: "Net Total",
            size: 6,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "FedTax",
            label: "Fed Tax",
            size: 3,
            required: false,
            type: "textfield",
            number: true,
        },
        {
            name: "StateTax",
            label: "State Tax",
            size: 3,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "SSTax",
            label: "SS Tax",
            size: 3,
            required: false,
            type: "textfield",
            number: true,
        },
        {
            name: "MedTax",
            label: "Med Tax",
            size: 3,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "TakeHome",
            label: "Take Home Total",
            size: 6,
            required: false,
            type: "textfield",
            number: true,
        },];

    const selectData: SelectDataType = [
        {
            key: "DriverID",
            data: drivers,
            optionValue: "ID",
            optionLabel: "FirstName+LastName",
            defaultValue: initialPayStub ? initialPayStub.DriverID : null,
        },
    ];

    function renderFields(field: any, index: number) {
        switch (field.type) {
            case "textfield": {
                return (
                    <Grid2
                        xs={field.size}
                        key={"form-" + index.toString() + "-" + field.name + "-grid"}
                    >
                        <RHTextfield
                            name={field.name}
                            control={control}
                            required={field.required}
                            label={field.label ?? field.name}
                            type={field.number ? "number" : "text"}
                            shouldError={field.shouldErrorOn?.includes(
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                errors[field.name]?.type
                            )}
                            errorMessage={field.errorMessage ?? ""}
                            multiline={!!field.multiline}
                            maxRows={field.maxRows ?? 1}
                            key={"form-" + index.toString() + "-" + field.name + "-field"}
                            disabled={field.disabled}
                        />
                    </Grid2>
                );
            }
            case "select": {
                const foundData = selectData.filter(
                    (item) => item.key === field.name
                )[0];
                if (!foundData) {
                    //error here
                    return null;
                }

                const {data, optionValue, optionLabel, defaultValue} = foundData;

                return (
                    <Grid2
                        xs={field.size}
                        key={"form-" + index.toString() + "-" + field.name + "-grid"}
                    >
                        <RHAutocomplete
                            name={field.name}
                            control={control}
                            data={data}
                            disabled={field.disabled}
                            optionLabel={optionLabel}
                            optionValue={optionValue}
                            defaultValue={defaultValue ?? null}
                            key={"form-" + index.toString() + "-" + field.name + "-field"}
                            label={field.label}
                            shouldError={field.shouldErrorOn?.includes(
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                errors[field.name]?.type
                            )}
                            errorMessage={field.errorMessage ?? ""}
                            searchQuery={field.searchQuery ?? ""}
                        />
                    </Grid2>
                );
            }
            case "date": {
                return (
                    <Grid2
                        xs={field.size}
                        key={"form-" + index.toString() + "-" + field.name + "-grid"}
                    >
                        <RHDatePicker
                            name={field.name}
                            control={control}
                            required={field.required}
                            shouldError={field.shouldErrorOn?.includes(
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                errors[field.name]?.type
                            )}
                            errorMessage={field.errorMessage}
                            label={field.label}
                        />
                    </Grid2>
                );
            }
            case "checkbox": {
                return (
                    <Grid2
                        xs={field.size}
                        key={"form-" + index.toString() + "-" + field.name + "-grid"}
                    >
                        <RHCheckbox
                            name={field.name}
                            control={control}
                            key={"form-" + index.toString() + "-" + field.name + "-field"}
                            label={field.label}
                            shouldError={field.shouldErrorOn?.includes(
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                errors[field.name]?.type
                            )}
                            errorMessage={field.errorMessage ?? ""}
                            disabled={field.disabled}
                        />
                    </Grid2>
                );
            }
            case "padding": {
                return (
                    <Grid2
                        xs={field.size}
                        key={"form-" + index.toString() + "-padding"}
                    ></Grid2>
                );
            }
        }
    }

    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 400,
        bgcolor: "background.paper",
        border: "2px solid #000",
        boxShadow: 24,
        p: 4,
    };

    return (
        <Box
            component="form"
            autoComplete="off"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            sx={{
                paddingLeft: 2.5,
            }}
        >
            <Grid2
                container
                columnSpacing={2}
                rowSpacing={2}
                justifyContent={!initialPayStub ? "space-between" : "right"}
            >
                {fields1.map((field, index) => renderFields(field, index))}

                <Grid2 xs={12}>
                    <PayStubJobs
                        readOnly={!!initialPayStub}
                        rows={jobs.length > 0 ? jobs : driverJobs ?? []}
                        updateTotal={(newTotal: number) => {
                            setValue("Gross", newTotal, { shouldValidate: true, shouldDirty: true });
                            trigger("Gross");  // Manually trigger form validation and re-rendering
                        }}
                        updateSelected={(newSelected: string[]) => {
                            setSelected(newSelected);
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            setValue("selected", newSelected);
                        }}
                    />
                </Grid2>

                {fields2.map((field, index) => renderFields(field, index))}

                {!initialPayStub && (
                    <Grid2 xs={3}>
                        <Button
                            type={"submit"}
                            variant={"contained"}
                            color={"primary"}
                            style={{backgroundColor: "#1565C0"}}
                            disabled={selected.length === 0}
                        >
                            Submit
                        </Button>
                    </Grid2>
                )}

                {initialPayStub && (
                    <>
                        <Grid2 xs={1}>
                            <Button
                                type={"button"}
                                variant={"contained"}
                                style={{backgroundColor: "#EF463B"}}
                                onClick={() => {
                                    confirmAlert({
                                        title: "Confirm Deletion",
                                        message:
                                            "Are you sure you want to delete this invoice? It will make any loads associated available again.",
                                        buttons: [
                                            {
                                                label: "Yes",
                                                onClick: async () => {
                                                    onDelete(initialPayStub).then();
                                                },
                                            },
                                            {
                                                label: "No",
                                                //onClick: () => {}
                                            },
                                        ],
                                    });
                                }}
                            >
                                Delete
                            </Button>
                        </Grid2>
                        <Grid2 xs={1}>
                            <Button
                                variant={"contained"}
                                color={"warning"}
                                style={{backgroundColor: "#ffa726"}}
                                onClick={async () => {
                                    toast("Generating PDF...", {autoClose: 2000, type: "info"});
                                    const element = document.createElement("a");
                                    element.href = "/api/getPDF/invoice/" + initialPayStub.ID?.toString();
                                    element.download = "invoice-download.pdf";
                                    document.body.appendChild(element);
                                    element.click();
                                    document.body.removeChild(element);
                                    // await printInvoice.mutateAsync({
                                    //     ...initialPayStub,
                                    //     selected: [],
                                    // });
                                }}
                            >
                                Print
                            </Button>
                        </Grid2>
                        <Grid2 xs={1}>
                            <Button
                                type={"submit"}
                                variant={"contained"}
                                color={"primary"}
                                style={{backgroundColor: "#1565C0"}}
                            >
                                Submit
                            </Button>
                        </Grid2>
                    </>
                )}
            </Grid2>
        </Box>
    );
};

export default PayStub;
