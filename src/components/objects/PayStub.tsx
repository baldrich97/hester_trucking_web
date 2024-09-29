import React, {useState} from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {DriversModel, InvoicesModel, LoadsModel, PayStubsModel, WeekliesModel} from "../../../prisma/zod";
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
import InvoiceLoads from "../collections/InvoiceLoads";
import InvoiceWeeklies from "../collections/InvoiceWeeklies";
import {toast} from "react-toastify";
import RHAutocomplete from "elements/RHAutocomplete";
import {confirmAlert} from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import ConsolidatedInvoices from "components/collections/ConsolidatedInvoices";

type PayStubsType = z.infer<typeof PayStubsModel>;
type DriversType = z.infer<typeof DriversModel>;

const defaultValues = {
   
};

const PayStub = ({
                     drivers,
                     loads = [],
                     initialPayStub = null,
                     lastInvoice = 0,
                     invoices = [],
                     weeklies = []
                 }: {
    drivers: DriversType[];
    loads?: LoadsType[];
    initialPayStub?: null | PayStubsType;
    refreshData?: any;
    lastInvoice?: number;
    invoices?: [] | PayStubsType[];
    weeklies?: [] | WeekliesType[];
}) => {
    const [driver, setDriver] = useState(0);
    const [paid, setPaid] = useState(initialPayStub?.Paid ?? false);
    const [shouldFetchLoads, setShouldFetchLoads] = useState(false);
    const [shouldFetchJobs, setShouldFetchJobs] = useState(false);
    const [driverJobs, setDriverJobs] = useState<any>([]);
    const [selected, setSelected] = useState<any>(
        //TODO change this to jobs
        !initialPayStub ? [] : loads?.map((load) => load.ID.toString())
    );
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentType, setPaymentType] = useState<string>("Check");
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
    } = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialPayStub ?? defaultValues,
    });

    if (initialPayStub) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setValue("selected", selected);
    }

    const key = initialPayStub ? "paystubs.post" : "paystubs.put";

    const addOrUpdateInvoice = trpc.useMutation(key, {
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
            console.log('JOBS', data)
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
        await addOrUpdateInvoice.mutateAsync(data);
        if (key === "paystubs.put") {
            await router.replace(router.asPath);
        }
        //setShouldFetchLoads(true);
        //setShouldFetchWeeklies(true);
    };

    const deleteInvoice = trpc.useMutation("invoices.delete", {
        async onSuccess() {
            toast("Successfully Deleted!", {autoClose: 2000, type: "success"});
        },
    });

    const onDelete = async (data: PayStubsType) => {
        toast("Deleting...", {autoClose: 2000, type: "info"});
        await deleteInvoice.mutateAsync(data);
        await router.replace("/invoices");
    };

    React.useEffect(() => {
        const subscription = watch((value, {name, type}) => {
            if (["DriverID"].includes(name ?? "") && type === "change") {
                const driverID = value.DriverID ?? 0;
                setDriver(driverID);
                setShouldFetchJobs(true)
                //setShouldFetchWeeklies(true)
            }
        });
        return () => subscription.unsubscribe();
    }, [watch]);

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
                name: "InvoiceDate",
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
            name: "Percentage",
            size: 6,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "GrossTotal",
            size: 6,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "FedTax",
            size: 3,
            required: false,
            type: "textfield",
            number: true,
        },
        {
            name: "StateTax",
            size: 3,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "SSTax",
            size: 3,
            required: false,
            type: "textfield",
            number: true,
        },
        {
            name: "MedTax",
            size: 3,
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "", size: 6, required: false, type: "padding"},
        {
            name: "NetTotal",
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
            <div>
                {/*<Modal*/}
                {/*    open={open}*/}
                {/*    onClose={handleClose}*/}
                {/*    aria-labelledby="modal-modal-title"*/}
                {/*    aria-describedby="modal-modal-description"*/}
                {/*>*/}
                {/*    <Box sx={style}>*/}
                {/*        <Typography*/}
                {/*            id="modal-modal-title"*/}
                {/*            variant="h6"*/}
                {/*            component="h2"*/}
                {/*            style={{paddingBottom: 10}}*/}
                {/*        >*/}
                {/*            Enter payment information*/}
                {/*        </Typography>*/}
                {/*        <Grid2 container columnSpacing={2} justifyContent={"right"}>*/}
                {/*            <Grid2 xs={6}>*/}
                {/*                <FormControl fullWidth={true} size={"small"}>*/}
                {/*                    <InputLabel id={"payment-label"}>Payment Type</InputLabel>*/}
                {/*                    <Select*/}
                {/*                        label={"Payment Type"}*/}
                {/*                        value={paymentType}*/}
                {/*                        onChange={(e) => {*/}
                {/*                            setPaymentType(e.target.value);*/}
                {/*                        }}*/}
                {/*                    >*/}
                {/*                        <MenuItem key={"SelectOption-Check"} value={"Check"}>*/}
                {/*                            Check*/}
                {/*                        </MenuItem>*/}
                {/*                        <MenuItem key={"SelectOption-Cash"} value={"Cash"}>*/}
                {/*                            Cash*/}
                {/*                        </MenuItem>*/}
                {/*                        <MenuItem*/}
                {/*                            key={"SelectOption-Credit_Card"}*/}
                {/*                            value={"Credit Card"}*/}
                {/*                        >*/}
                {/*                            Credit Card*/}
                {/*                        </MenuItem>*/}
                {/*                    </Select>*/}
                {/*                </FormControl>*/}
                {/*            </Grid2>*/}
                {/*            /!*<Grid2 xs={6}>*/}
                {/*                <TextField label={'Payment Amount'} value={paymentAmount} fullWidth type={'number'} size={'small'} onChange={(e) => {*/}
                {/*                    setPaymentAmount(parseInt(e.currentTarget.value, 10));*/}
                {/*                }}/>*/}
                {/*            </Grid2>*!/*/}
                {/*            <Grid2 xs={6} style={{paddingTop: 5}}>*/}
                {/*                <Button*/}
                {/*                    variant={"contained"}*/}
                {/*                    color={"success"}*/}
                {/*                    style={{backgroundColor: "#66bb6a"}}*/}
                {/*                    onClick={async () => {*/}
                {/*                        if (*/}
                {/*                            !["Cash", "Check", "Credit Card"].includes(paymentType)*/}
                {/*                        ) {*/}
                {/*                            handleClose();*/}
                {/*                        } else {*/}
                {/*                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment*/}
                {/*                            // @ts-ignore*/}
                {/*                            await payInvoice.mutateAsync({*/}
                {/*                                ...initialPayStub,*/}
                {/*                                PaymentType: paymentType,*/}
                {/*                                selected: [],*/}
                {/*                            });*/}
                {/*                            setPaymentType("Check");*/}
                {/*                            setPaymentAmount(0);*/}
                {/*                            handleClose();*/}
                {/*                            forceUpdate();*/}
                {/*                        }*/}
                {/*                    }}*/}
                {/*                >*/}
                {/*                    Submit Payment*/}
                {/*                </Button>*/}
                {/*            </Grid2>*/}
                {/*        </Grid2>*/}
                {/*    </Box>*/}
                {/*</Modal>*/}
            </div>
            <Grid2
                container
                columnSpacing={2}
                rowSpacing={2}
                justifyContent={!initialPayStub ? "space-between" : "right"}
            >
                {fields1.map((field, index) => renderFields(field, index))}

                {/*<Grid2 xs={12}>*/}
                {/*    {invoices !== null && invoices !== undefined && invoices.length > 0 ? (*/}
                {/*        <ConsolidatedInvoices rows={invoices}/>*/}
                {/*    ) : loads.length > 0 ? (*/}
                {/*        <InvoiceLoads*/}
                {/*            readOnly={!!initialPayStub}*/}
                {/*            rows={loads.length > 0 ? loads : []}*/}
                {/*            updateTotal={(newTotal: number) => {*/}
                {/*                setValue("TotalAmount", newTotal);*/}
                {/*            }}*/}
                {/*            updateSelected={(newSelected: string[]) => {*/}
                {/*                setSelected(newSelected);*/}
                {/*                // eslint-disable-next-line @typescript-eslint/ban-ts-comment*/}
                {/*                // @ts-ignore*/}
                {/*                setValue("selected", newSelected);*/}
                {/*            }}*/}
                {/*        />*/}
                {/*    ) : (*/}
                {/*        <InvoiceWeeklies*/}
                {/*            readOnly={!!initialPayStub}*/}
                {/*            rows={weeklies.length > 0 ? weeklies : customerWeeklies ?? []}*/}
                {/*            updateTotal={(newTotal: number) => {*/}
                {/*                setValue("TotalAmount", newTotal);*/}
                {/*            }}*/}
                {/*            updateSelected={(newSelected: string[]) => {*/}
                {/*                setSelected(newSelected);*/}
                {/*                // eslint-disable-next-line @typescript-eslint/ban-ts-comment*/}
                {/*                // @ts-ignore*/}
                {/*                setValue("selected", newSelected);*/}
                {/*            }}*/}
                {/*        />*/}
                {/*    )}*/}
                {/*</Grid2>*/}

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
