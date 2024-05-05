import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {CustomersModel, InvoicesModel, LoadsModel, WeekliesModel} from "../../../prisma/zod";
import { trpc } from "../../utils/trpc";
import { useRouter } from "next/router";
import { FormFieldsType, SelectDataType } from "../../utils/types";
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
import { toast } from "react-toastify";
import RHAutocomplete from "elements/RHAutocomplete";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import ConsolidatedInvoices from "components/collections/ConsolidatedInvoices";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type WeekliesType = z.infer<typeof WeekliesModel>;

const defaultValues = {
  InvoiceDate: new Date(),
  Number: 0,
  CustomerID: undefined,
  TotalAmount: 0,
  PaidDate: null,
  CheckNumber: "",
  Paid: false,
  Printed: false,
  PaymentType: "N/A",
};

const Invoice = ({
  customers,
  loads = [],
  initialInvoice = null,
  lastInvoice = 0,
  invoices = [],
    weeklies = []
}: {
  customers: CustomersType[];
  loads?: LoadsType[];
  initialInvoice?: null | InvoicesType;
  refreshData?: any;
  lastInvoice?: number;
  invoices?: [] | InvoicesType[];
  weeklies?: [] | WeekliesType[];
}) => {
  const [customer, setCustomer] = useState(0);

  const [paid, setPaid] = useState(initialInvoice?.Paid ?? false);

  const [shouldFetchLoads, setShouldFetchLoads] = useState(false);

  const [shouldFetchWeeklies, setShouldFetchWeeklies] = useState(false);

  const [customerLoads, setCustomerLoads] = useState<any>([]);

  const [customerWeeklies, setCustomerWeeklies] = useState<any>([]);

  const [selected, setSelected] = useState<any>(
    !initialInvoice ? [] : loads?.map((load) => load.ID.toString())
  );

  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const [paymentType, setPaymentType] = useState<string>("Check");

  //this is for forcing it to rerender
  const [_, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const router = useRouter();

  let validationSchema = initialInvoice
    ? InvoicesModel
    : InvoicesModel.omit({ ID: true });

  validationSchema = validationSchema.extend({
    selected: z.array(z.string()),
  });

  type ValidationSchema = z.infer<typeof validationSchema>;

  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
    watch,
    setValue,
  } = useForm<ValidationSchema>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialInvoice ?? defaultValues,
  });

  if (initialInvoice) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    setValue("selected", selected);
  } else {
    setValue("Number", lastInvoice);
  }

  const key = initialInvoice ? "invoices.post" : "invoices.put";

  const addOrUpdateInvoice = trpc.useMutation(key, {
    async onSuccess(data) {
      reset(initialInvoice ? data : defaultValues);
      toast("Successfully Submitted!", { autoClose: 2000, type: "success" });
    },
    async onError(error) {
      toast("There was an issue creating this invoice. The issue was: " + error.message, { autoClose: 100000, type: "error"})
      return;
    }
  });

  const payInvoice = trpc.useMutation("invoices.postPaid", {
    async onSuccess(data) {
      reset(data ? data : defaultValues);
      toast("Successfully Paid!", { autoClose: 2000, type: "success" });
      await router.replace(router.asPath);
    },
  });

  const printInvoice = trpc.useMutation("invoices.postPrinted", {
    async onSuccess(data) {
      reset(data ? data : defaultValues);
      toast("Successfully Generated!", { autoClose: 2000, type: "success" });
    },
  });

  trpc.useQuery(["loads.getByCustomer", { customer }], {
    enabled: shouldFetchLoads,
    onSuccess(data) {
      setCustomerLoads(data);
      setShouldFetchLoads(false);
      setValue("TotalAmount", 0);
    },
    onError(error) {
      console.warn(error);
    },
  });

  trpc.useQuery(["weeklies.getByCustomer", { customer }], {
    enabled: shouldFetchWeeklies,
    onSuccess(data) {
      setCustomerWeeklies(data);
      setShouldFetchWeeklies(false);
      setValue("TotalAmount", 0);
    },
    onError(error) {
      console.warn(error);
    },
  });

  const onSubmit = async (data: ValidationSchema) => {
    toast("Submitting...", { autoClose: 2000, type: "info" });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await addOrUpdateInvoice.mutateAsync(data);
    if (key === "invoices.put") {
      await router.replace(router.asPath);
    }
    setShouldFetchLoads(true);
    setShouldFetchWeeklies(true);
  };

  const deleteInvoice = trpc.useMutation("invoices.delete", {
    async onSuccess() {
      toast("Successfully Deleted!", { autoClose: 2000, type: "success" });
    },
  });

  const onDelete = async (data: InvoicesType) => {
    toast("Deleting...", { autoClose: 2000, type: "info" });
    await deleteInvoice.mutateAsync(data);
    await router.replace("/invoices");
  };

  React.useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (["CustomerID"].includes(name ?? "") && type === "change") {
        const customerID = value.CustomerID ?? 0;
        setCustomer(customerID);
        setShouldFetchLoads(true);
        setShouldFetchWeeklies(true)
      } else if (["CustomerID"].includes(name ?? "") && type === "change") {
        const newPaid = value.Paid ?? false;
        setPaid(newPaid);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const fields1: FormFieldsType = !initialInvoice
    ? [
        {
          name: "CustomerID",
          size: 9,
          required: true,
          shouldErrorOn: ["invalid_type"],
          errorMessage: "Customer is required.",
          type: "select",
          label: "Customer",
          searchQuery: "customers",
        },
        {
          name: "Number",
          size: 3,
          required: false,
          type: "textfield",
          number: true,
        },
      ]
    : [
        {
          name: "CustomerID",
          size: 6,
          required: true,
          shouldErrorOn: ["invalid_type"],
          errorMessage: "Customer is required.",
          type: "select",
          label: "Customer",
          disabled: true,
          searchQuery: "customers",
        },
        {
          name: "Consolidated",
          size: 2,
          required: false,
          type: "checkbox",
          disabled: true,
        },
        {
          name: "Printed",
          size: 2,
          required: false,
          type: "checkbox",
          disabled: true,
        },
        {
          name: "Paid",
          size: 1,
          required: false,
          type: "checkbox",
          disabled: true,
        },
        {
          name: "Number",
          size: 1,
          required: false,
          type: "textfield",
          number: true,
        },
      ];

  const fields2: FormFieldsType = [];

  if (initialInvoice) {
    fields2.push(
      {
        name: "PaidDate",
        size: 4,
        required: false,
        type: "date",
        label: "Paid Date",
      },
      {
        name: "CheckNumber",
        size: 3,
        required: false,
        type: "textfield",
        label: "Check Number",
      },
      {
        name: "PaymentType",
        size: 3,
        required: false,
        type: "textfield",
        label: "Payment Type",
        disabled: true,
      }
    );
  } else {
    fields2.push({ name: "", size: 7, required: false, type: "padding" });
  }

  fields2.push({
    name: "TotalAmount",
    size: !initialInvoice ? 5 : 2,
    required: true,
    shouldErrorOn: ["required", "too_small"],
    errorMessage: "Total amount is required.",
    type: "textfield",
    number: true,
    label: "Total Amount",
  });

  const selectData: SelectDataType = [
    {
      key: "CustomerID",
      data: customers,
      optionValue: "ID",
      optionLabel: "Name+|+Street+,+City",
      defaultValue: initialInvoice ? initialInvoice.CustomerID : null,
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

        const { data, optionValue, optionLabel, defaultValue } = foundData;

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
              disabled={true}
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
        <Modal
          open={open}
          onClose={handleClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={style}>
            <Typography
              id="modal-modal-title"
              variant="h6"
              component="h2"
              style={{ paddingBottom: 10 }}
            >
              Enter payment information
            </Typography>
            <Grid2 container columnSpacing={2} justifyContent={"right"}>
              <Grid2 xs={6}>
                <FormControl fullWidth={true} size={"small"}>
                  <InputLabel id={"payment-label"}>Payment Type</InputLabel>
                  <Select
                    label={"Payment Type"}
                    value={paymentType}
                    onChange={(e) => {
                      setPaymentType(e.target.value);
                    }}
                  >
                    <MenuItem key={"SelectOption-Check"} value={"Check"}>
                      Check
                    </MenuItem>
                    <MenuItem key={"SelectOption-Cash"} value={"Cash"}>
                      Cash
                    </MenuItem>
                    <MenuItem
                      key={"SelectOption-Credit_Card"}
                      value={"Credit Card"}
                    >
                      Credit Card
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid2>
              {/*<Grid2 xs={6}>
                                <TextField label={'Payment Amount'} value={paymentAmount} fullWidth type={'number'} size={'small'} onChange={(e) => {
                                    setPaymentAmount(parseInt(e.currentTarget.value, 10));
                                }}/>
                            </Grid2>*/}
              <Grid2 xs={6} style={{ paddingTop: 5 }}>
                <Button
                  variant={"contained"}
                  color={"success"}
                  style={{ backgroundColor: "#66bb6a" }}
                  onClick={async () => {
                    if (
                      !["Cash", "Check", "Credit Card"].includes(paymentType)
                    ) {
                      handleClose();
                    } else {
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      await payInvoice.mutateAsync({
                        ...initialInvoice,
                        PaymentType: paymentType,
                        selected: [],
                      });
                      setPaymentType("Check");
                      setPaymentAmount(0);
                      handleClose();
                      forceUpdate();
                    }
                  }}
                >
                  Submit Payment
                </Button>
              </Grid2>
            </Grid2>
          </Box>
        </Modal>
      </div>
      <Grid2
        container
        columnSpacing={2}
        rowSpacing={2}
        justifyContent={!initialInvoice ? "space-between" : "right"}
      >
        {fields1.map((field, index) => renderFields(field, index))}

        <Grid2 xs={12}>
          {invoices !== null && invoices !== undefined && invoices.length > 0 ? (
            <ConsolidatedInvoices rows={invoices} />
          ) : (weeklies !== null && weeklies !== undefined && weeklies.length > 0) || (customerWeeklies !== null && customerWeeklies !== undefined && customerWeeklies.length > 0) ? (
              <InvoiceWeeklies
                  readOnly={!!initialInvoice}
                  rows={weeklies.length > 0 ? weeklies : customerWeeklies}
                  updateTotal={(newTotal: number) => {
                    setValue("TotalAmount", newTotal);
                  }}
                  updateSelected={(newSelected: string[]) => {
                    setSelected(newSelected);
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    setValue("selected", newSelected);
                  }}
              />
          ) : (
              <InvoiceLoads
                  readOnly={!!initialInvoice}
                  rows={loads.length > 0 ? loads : customerLoads}
                  updateTotal={(newTotal: number) => {
                    setValue("TotalAmount", newTotal);
                  }}
                  updateSelected={(newSelected: string[]) => {
                    setSelected(newSelected);
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    setValue("selected", newSelected);
                  }}
              />
          )}
        </Grid2>

        {fields2.map((field, index) => renderFields(field, index))}

        {!initialInvoice && (
          <Grid2 xs={3}>
            <Button
              type={"submit"}
              variant={"contained"}
              color={"primary"}
              style={{ backgroundColor: "#1565C0" }}
              disabled={selected.length === 0}
            >
              Submit
            </Button>
          </Grid2>
        )}

        {initialInvoice && (
          <>
            <Grid2 xs={1}>
              <Button
                type={"button"}
                variant={"contained"}
                style={{ backgroundColor: "#EF463B" }}
                onClick={() => {
                  confirmAlert({
                    title: "Confirm Deletion",
                    message:
                      "Are you sure you want to delete this invoice? It will make any loads associated available again.",
                    buttons: [
                      {
                        label: "Yes",
                        onClick: async () => {
                          onDelete(initialInvoice).then();
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
                style={{ backgroundColor: "#ffa726" }}
                onClick={async () => {
                  toast("Generating PDF...", { autoClose: 2000, type: "info" });
                  const element = document.createElement("a");
                  element.href = "/api/getPDF/invoice/" + initialInvoice.ID?.toString();
                  element.download = "invoice-download.pdf";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                  await printInvoice.mutateAsync({
                    ...initialInvoice,
                    selected: [],
                  });
                }}
              >
                Print
              </Button>
            </Grid2>
            <Grid2 xs={1}>
              <Button
                variant={"contained"}
                color={"success"}
                style={{ backgroundColor: "#66bb6a" }}
                disabled={!!initialInvoice.Paid || paid}
                onClick={handleOpen}
              >
                Pay
              </Button>
            </Grid2>
            <Grid2 xs={1}>
              <Button
                type={"submit"}
                variant={"contained"}
                color={"primary"}
                style={{ backgroundColor: "#1565C0" }}
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

export default Invoice;
