/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import CustomerObject from "../../components/objects/Customer";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import {
  CustomersModel,
  InvoicesModel,
  StatesModel,
  CustomerLoadTypesModel,
  CustomerDeliveryLocationsModel,
} from "../../../prisma/zod";
import { z } from "zod";
import Grid2 from "@mui/material/Unstable_Grid2";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import GenericTable from "elements/GenericTable";
import { TableColumnOverridesType, TableColumnsType } from "utils/types";
import {
  Invoices,
  Customers,
  Loads,
  DeliveryLocations,
  Drivers,
  LoadTypes,
  Trucks,
  CustomerDeliveryLocations,
  CustomerLoadTypes,
} from "@prisma/client";
import { trpc } from "utils/trpc";
import Close from "@mui/icons-material/Close";
import { Button, Modal, Typography } from "@mui/material";
import { toast } from "react-toastify";

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type InvoicesType = z.infer<typeof InvoicesModel>;
type CustomerLoadTypesType = z.infer<typeof CustomerLoadTypesModel>;
type CustomerDeliveryLocationsType = z.infer<
  typeof CustomerDeliveryLocationsModel
>;

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 800,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
};

const columns: TableColumnsType = [
  { name: "InvoiceDate", as: "Invoice Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "PaidDate", as: "Date Paid" },
  { name: "Paid" },
  { name: "Printed" },
  { name: "PaymentType", as: "Payment Type" },
  { name: "ID", as: "", navigateTo: "/invoices/" },
];

const overrides: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Paid", type: "checkbox" },
  { name: "Printed", type: "checkbox" },
  { name: "PaidDate", type: "date" },
  { name: "InvoiceDate", type: "date" },
];

const lcolumns: TableColumnsType = [
  { name: "StartDate", as: "Start Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "LoadTypes.Description", as: "Load Type" },
  { name: "DeliveryLocations.Description", as: "Delivery Notes" },
  { name: "TicketNumber", as: "Ticket #" },
  { name: "Invoiced" },
  { name: "ID", as: "", navigateTo: "/loads/" },
];

const loverrides: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "StartDate", type: "date" },
  { name: "Invoiced", type: "checkbox" },
];

const Customer = ({
  states,
  initialCustomer,
  invoices,
  icount,
  lcount,
  loads,
  ltcount,
  dlcount,
}: {
  states: StatesType[];
  initialCustomer: CustomersType;
  invoices: InvoicesType[];
  icount: number;
  lcount: number;
  loads: Loads[];
  ltcount: number;
  dlcount: number;
}) => {
  const ltcolumns: TableColumnsType = [
    { name: "LoadTypes.Description", as: "Description" },
    { name: "LoadTypes.Notes", as: "Notes" },
    { name: "Remove", as: "" },
  ];

  const ltoverrides: TableColumnOverridesType = [
    {
      name: "Remove",
      type: "action",
      callback: handleDeleteLoadType,
      icon: <Close />,
    },
  ];

  const dlcolumns: TableColumnsType = [
    { name: "DeliveryLocations.Description", as: "Description" },
    { name: "Remove", as: "" },
  ];

  const dloverrides: TableColumnOverridesType = [
    {
      name: "Remove",
      type: "action",
      callback: handleDeleteDeliveryLocation,
      icon: <Close />,
    },
  ];

  const [deletedItem, setDeletedItem] = useState<
    CustomerDeliveryLocationsType | CustomerLoadTypesType | null
  >(null);

  function handleDeleteLoadType(item: CustomerLoadTypesType) {
    setMethod("customerloadtypes.delete");
    setDeletedItem(item);
    handleOpen();
  }

  function handleDeleteDeliveryLocation(item: CustomerDeliveryLocationsType) {
    setMethod("customerdeliverylocations.delete");
    setDeletedItem(item);
    handleOpen();
  }

  const [tabValue, setTabValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const [trpcData, setData] = useState<InvoicesType[]>([]);

  const [ltrpcData, lsetData] = useState<LoadTypes[]>([]);

  const [shouldRefresh, setShouldRefresh] = useState(false);

  const [lshouldRefresh, lsetShouldRefresh] = useState(false);

  const [page, setPage] = useState(0);

  const [lpage, lsetPage] = useState(0);

  const [lttrpcData, ltsetData] = useState<CustomerLoadTypes[]>([]);

  const [dltrpcData, dlsetData] = useState<CustomerDeliveryLocations[]>([]);

  const [ltshouldRefresh, ltsetShouldRefresh] = useState(false);

  const [dlshouldRefresh, dlsetShouldRefresh] = useState(false);

  const [ltpage, ltsetPage] = useState(0);

  const [dlpage, dlsetPage] = useState(0);

  const [open, setOpen] = useState(false);

  const [method, setMethod] = useState<
    "customerdeliverylocations.delete" | "customerloadtypes.delete"
  >("customerdeliverylocations.delete");

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setDeletedItem(null);
  };

  trpc.useQuery(["invoices.getAll", { page, customer: initialCustomer.ID }], {
    enabled: shouldRefresh,
    onSuccess(data) {
      setData(JSON.parse(JSON.stringify(data)));
      setShouldRefresh(false);
    },
    onError(error) {
      console.warn(error.message);
      setShouldRefresh(false);
    },
  });

  trpc.useQuery(
    ["loads.getAll", { page: lpage, customer: initialCustomer.ID }],
    {
      enabled: lshouldRefresh,
      onSuccess(data) {
        lsetData(JSON.parse(JSON.stringify(data)));
        lsetShouldRefresh(false);
      },
      onError(error) {
        console.warn(error.message);
        lsetShouldRefresh(false);
      },
    }
  );

  trpc.useQuery(
    [
      "customerloadtypes.getAll",
      { page: ltpage, CustomerID: initialCustomer.ID },
    ],
    {
      enabled: ltshouldRefresh || (ltcount !== 0 && ltrpcData.length === 0),
      onSuccess(data) {
        ltsetData(JSON.parse(JSON.stringify(data)));
        ltsetShouldRefresh(false);
      },
      onError(error) {
        console.warn(error.message);
        ltsetShouldRefresh(false);
      },
    }
  );

  trpc.useQuery(
    [
      "customerdeliverylocations.getAll",
      { page: dlpage, CustomerID: initialCustomer.ID },
    ],
    {
      enabled: dlshouldRefresh || (dlcount !== 0 && dltrpcData.length === 0),
      onSuccess(data) {
        dlsetData(JSON.parse(JSON.stringify(data)));
        dlsetShouldRefresh(false);
      },
      onError(error) {
        console.warn(error.message);
        dlsetShouldRefresh(false);
      },
    }
  );

  const deleteRelated = trpc.useMutation([method], {
    async onSuccess() {
      window.location.reload();
    },
  });

  return (
    <Grid2 container>
      <Grid2 xs={12} sx={{ paddingRight: 2.5 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: 2 }}>
          <Tabs value={tabValue} onChange={handleChange}>
            <Tab label="Details" />
            <Tab label="Invoices" />
            <Tab label="Loads" />
          </Tabs>
        </Box>
        {tabValue === 0 && (
          <Grid2 container>
            <Grid2 xs={12} sx={{ paddingBottom: 2.5 }}>
              <CustomerObject
                states={states}
                initialCustomer={initialCustomer}
              />
            </Grid2>
            <Grid2 container xs={12}>
              <Grid2 xs={6} sx={{ paddingRight: 1.25 }}>
                {/* <Box
                  sx={{
                    backgroundColor: "#757575",
                    borderRadius: 1.5,
                    marginBottom: 2,
                  }}
                > */}
                <Typography sx={{ padding: 1 }} variant="h5">
                  Associated Load Types
                </Typography>
                {/* </Box> */}
                <GenericTable
                  data={lttrpcData}
                  columns={ltcolumns}
                  overrides={ltoverrides}
                  count={ltcount}
                  refreshData={(page: React.SetStateAction<number>) => {
                    ltsetPage(page);
                    ltsetShouldRefresh(true);
                  }}
                />
              </Grid2>
              <Grid2 xs={6} sx={{ paddingLeft: 1.25 }}>
                <Typography sx={{ padding: 1 }} variant="h5">
                  Associated Delivery Locations
                </Typography>
                <GenericTable
                  data={dltrpcData}
                  columns={dlcolumns}
                  overrides={dloverrides}
                  count={dlcount}
                  refreshData={(page: React.SetStateAction<number>) => {
                    dlsetPage(page);
                    dlsetShouldRefresh(true);
                  }}
                />
              </Grid2>
            </Grid2>
          </Grid2>
        )}
        {tabValue === 1 && (
          <GenericTable
            data={page === 0 ? invoices : trpcData}
            columns={columns}
            overrides={overrides}
            count={icount}
            refreshData={(page: React.SetStateAction<number>) => {
              setPage(page);
              setShouldRefresh(true);
            }}
          />
        )}
        {tabValue === 2 && (
          <GenericTable
            data={lpage === 0 ? loads : ltrpcData}
            columns={lcolumns}
            overrides={loverrides}
            count={lcount}
            refreshData={(page: React.SetStateAction<number>) => {
              lsetPage(page);
              lsetShouldRefresh(true);
            }}
          />
        )}
        <Modal open={open} onClose={handleClose}>
          <Box sx={style}>
            <Box
              sx={{
                backgroundColor: "#757575",
              }}
            >
              <Typography color="white" variant="h6" style={{ padding: 4 }}>
                Confirm Deletion
              </Typography>
            </Box>

            <Typography variant="h6" style={{ textAlign: "center" }}>
              Are you sure you want to delete this associated record? It will no
              longer be recommended on future load creation.
            </Typography>
            <Grid2 container columnSpacing={2} justifyContent={"space-between"}>
              <Grid2 xs={6} style={{ paddingTop: 5 }}>
                <Button
                  variant={"contained"}
                  style={{ backgroundColor: "#757575" }}
                  onClick={async () => {
                    handleClose();
                  }}
                >
                  Cancel
                </Button>
              </Grid2>

              <Grid2
                xs={6}
                style={{
                  paddingTop: 5,
                  display: "flex",
                  justifyContent: "end",
                }}
              >
                <Button
                  variant={"contained"}
                  style={{ backgroundColor: "red" }}
                  onClick={async () => {
                    if (deletedItem) {
                      toast("Deleting...", {
                        autoClose: 2000,
                        type: "warning",
                      });
                      await deleteRelated.mutateAsync({ ...deletedItem });
                    }

                    handleClose();
                  }}
                >
                  Delete
                </Button>
              </Grid2>
            </Grid2>
          </Box>
        </Modal>
      </Grid2>
    </Grid2>
  );
};

export default Customer;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id;

  let initialCustomer;

  let invoices: (Invoices & { Customers: Customers; Loads: Loads[] })[] = [];

  let loads: (Loads & {
    Customers: Customers | null;
    DeliveryLocations: DeliveryLocations | null;
    Drivers: Drivers | null;
    LoadTypes: LoadTypes | null;
    Trucks: Trucks | null;
  })[] = [];

  let lcount = 0;

  let icount = 0;

  let dlcount = 0;

  let ltcount = 0;

  if (id && typeof id === "string") {
    initialCustomer = await prisma.customers.findFirst({
      where: {
        ID: parseInt(id),
      },
    });
    invoices = await prisma.invoices.findMany({
      include: {
        Customers: true,
        Loads: true,
      },
      take: 10,
      orderBy: {
        ID: "desc",
      },
      where: { AND: { CustomerID: parseInt(id) } },
    });

    loads = await prisma.loads.findMany({
      include: {
        Customers: true,
        Trucks: true,
        Drivers: true,
        LoadTypes: true,
        DeliveryLocations: true,
      },
      orderBy: {
        ID: "desc",
      },
      where: {
        OR: [
          {
            Deleted: false,
          },
          {
            Deleted: null,
          },
        ],
        AND: { CustomerID: parseInt(id) },
      },
      take: 10,
    });

    icount = await prisma.invoices.count({
      where: { CustomerID: parseInt(id) },
    });

    lcount = await prisma.loads.count({
      where: {
        OR: [
          {
            Deleted: false,
          },
          {
            Deleted: null,
          },
        ],
        AND: { CustomerID: parseInt(id) },
      },
    });

    dlcount = await prisma.customerDeliveryLocations.count({
      where: { CustomerID: parseInt(id) },
    });

    ltcount = await prisma.customerLoadTypes.count({
      where: { CustomerID: parseInt(id) },
    });
  }

  if (!initialCustomer) {
    return {
      redirect: {
        permanent: false,
        destination: "/customers",
      },
    };
  }

  const states = await prisma.states.findMany({});

  return {
    props: {
      states,
      initialCustomer,
      invoices: JSON.parse(JSON.stringify(invoices)),
      loads: JSON.parse(JSON.stringify(loads)),
      icount,
      lcount,
      dlcount,
      ltcount,
    },
  };
};
