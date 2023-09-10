import React, { useState } from "react";
import Box from "@mui/material/Box";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CustomersModel,
  InvoicesModel,
  LoadsModel,
  TrucksModel,
  LoadTypesModel,
  DeliveryLocationsModel,
  DriversModel,
} from "../../../prisma/zod";
import { trpc } from "../../utils/trpc";
import { useRouter } from "next/router";
import GenericForm from "../../elements/GenericForm";
import { toast } from "react-toastify";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type TrucksType = z.infer<typeof TrucksModel>;
type DriversType = z.infer<typeof DriversModel>;
import { FormFieldsType, SelectDataType } from "../../utils/types";
import { CustomerDeliveryLocations, CustomerLoadTypes } from "@prisma/client";

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
  TicketNumber: 0,
};

function Load({
  customers,
  loadTypes,
  deliveryLocations,
  trucks,
  drivers,
  initialLoad = null,
  refreshData,
}: {
  customers: CustomersType[];
  loadTypes: LoadTypesType[];
  deliveryLocations: DeliveryLocationsType[];
  trucks: TrucksType[];
  drivers: DriversType[];
  initialLoad?: null | LoadsType;
  refreshData?: any;
}) {
  function useForceUpdate() {
    const [value, setValue] = useState(0); // integer state
    return () => setValue((value) => value + 1); // update state to force render
  }

  const forceUpdate = useForceUpdate();

  const router = useRouter();

  const validationSchema = initialLoad
    ? LoadsModel
    : LoadsModel.omit({ ID: true });

  type ValidationSchema = z.infer<typeof validationSchema>;

  const {
    handleSubmit,
    formState: { errors },
    control,
    resetField,
    reset,
    watch,
    setValue,
  } = useForm<ValidationSchema>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialLoad ?? defaultValues,
  });
  const key = initialLoad ? "loads.post" : "loads.put";

  const addOrUpdateLoad = trpc.useMutation(key, {
    async onSuccess(data) {
      toast("Successfully Submitted!", { autoClose: 2000, type: "success" });
      initialLoad && reset(data);
    },
  });

  const onSubmit = async (data: ValidationSchema) => {
    toast("Submitting...", { autoClose: 2000, type: "info" });
    await addOrUpdateLoad.mutateAsync(data);
    if (key === "loads.put") {
      resetField("Weight");
      resetField("Hours");
      resetField("TotalAmount");
      resetField("TicketNumber");
      refreshData();
    }
  };

  const [customer, setCustomer] = useState(
    initialLoad ? (initialLoad.CustomerID ? initialLoad.CustomerID : 0) : 0
  );

  const [lttrpcData, ltsetData] = useState<CustomerLoadTypes[]>([]);

  const [dltrpcData, dlsetData] = useState<CustomerDeliveryLocations[]>([]);

  const [ltshouldRefresh, ltsetShouldRefresh] = useState(false);

  const [dlshouldRefresh, dlsetShouldRefresh] = useState(false);

  trpc.useQuery(["loadtypes.search", { CustomerID: customer }], {
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

  trpc.useQuery(
    ["customerdeliverylocations.getAll", { CustomerID: customer }],
    {
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
    }
  );

  React.useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (
        ["MaterialRate", "TruckRate", "Hours", "Weight"].includes(name ?? "") &&
        type === "change"
      ) {
        const hours = value.Hours ?? 0;
        const weight = value.Weight ?? 0;
        setValue(
          "TotalRate",
          (value.MaterialRate ?? 0) + (value.TruckRate ?? 0)
        );
        setValue(
          "TotalAmount",
          (value.TotalRate ?? 0) * (hours > 0 ? hours : weight)
        );
      }
      if (name === "CustomerID" && type === "change") {
        setCustomer(value.CustomerID ?? 0);
        dlsetShouldRefresh(true);
        ltsetShouldRefresh(true);
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
    },
    {
      name: "StartDate",
      size: 4,
      required: false,
      type: "date",
      label: "Start Date",
    },
    {
      name: "EndDate",
      size: 4,
      required: false,
      type: "date",
      label: "End Date",
    },
    {
      name: "TicketNumber",
      required: false,
      type: "textfield",
      size: 4,
      number: true,
      label: "Ticket Number",
    },
    {
      name: "DriverID",
      size: 6,
      required: false,
      type: "select",
      label: "Driver",
      searchQuery: "drivers",
    },
    {
      name: "TruckID",
      size: 6,
      required: false,
      type: "select",
      label: "Truck",
      searchQuery: "trucks",
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
      groupByNames: "Used by Customer|New for Customer"
    },
    {
      name: "DeliveryLocationID",
      size: 6,
      required: false,
      type: "select",
      label: "Delivery Location",
      searchQuery: "deliverylocations",
      groupBy: "Recommend",
      groupByNames: "Used by Customer|New for Customer"
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
    { name: "Received", size: 6, required: false, type: "textfield" },
    {
      name: "TotalRate",
      required: false,
      type: "textfield",
      size: 3,
      number: true,
      label: "Total Rate",
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
      data: trucks,
      optionValue: "ID",
      optionLabel: "Name+|+Notes",
      defaultValue: initialLoad ? initialLoad.TruckID : null,
    },
    {
      key: "DriverID",
      data: drivers,
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
        />
      </Box>
    </>
  );
}

export default Load;
