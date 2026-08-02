/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";
import CustomerObject from "../../components/objects/Customer";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import {
  CustomersModel,
  InvoicesModel,
  StatesModel,
} from "../../../prisma/zod";
import { z } from "zod";
import Grid2 from "@mui/material/Unstable_Grid2";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import GenericTable from "elements/GenericTable";
import PaginatedAssociationTable from "elements/PaginatedAssociationTable";
import TableCell from "@mui/material/TableCell";
import { TableColumnOverridesType, TableColumnsType } from "utils/types";
import {
  Invoices,
  Loads,
} from "@prisma/client";

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type InvoicesType = z.infer<typeof InvoicesModel>;

function formatAssociationDate(value: unknown) {
  if (!value) {
    return "—";
  }
  return new Date(String(value)).toLocaleDateString();
}

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
  invoices: InvoicesType[] | Record<string, unknown>[];
  icount: number;
  lcount: number;
  loads: Loads[] | Record<string, unknown>[];
  ltcount: number;
  dlcount: number;
}) => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const customerId = initialCustomer.ID;
  const invoiceTableInput = { customer: customerId };
  const loadTableInput = { customer: customerId };

  return (
    <Grid2 container sx={{width: "100%"}}>
      <Grid2 xs={12}>
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
            <Grid2
              container
              spacing={2}
              sx={{width: "100%", px: 2.5, display: "flex"}}
            >
              <Grid2 xs={12} lg={6} sx={{minWidth: 0, flex: {xs: "1 1 100%", lg: "1 1 50%"}, maxWidth: {xs: "100%", lg: "50%"}}}>
                <PaginatedAssociationTable
                  title="Associated Load Types"
                  procedure="customerloadtypes.getAllPage"
                  customerId={customerId}
                  initialCount={ltcount}
                  orderBy="LoadTypeID"
                  emptyMessage="No load types on file for this customer."
                  headCells={["Last hauled", "Load type", "Notes", "Times hauled"]}
                  getRowKey={(row) => String(row.LoadTypeID)}
                  renderCells={(row) => {
                    const loadTypes = row.LoadTypes as
                      | {Description?: string; Notes?: string | null}
                      | undefined;
                    return (
                      <>
                        <TableCell>{formatAssociationDate(row.lastUsed)}</TableCell>
                        <TableCell>{loadTypes?.Description ?? "—"}</TableCell>
                        <TableCell>{loadTypes?.Notes ?? "N/A"}</TableCell>
                        <TableCell align="right">{String(row.useCount ?? 0)}</TableCell>
                      </>
                    );
                  }}
                />
              </Grid2>
              <Grid2 xs={12} lg={6} sx={{minWidth: 0, flex: {xs: "1 1 100%", lg: "1 1 50%"}, maxWidth: {xs: "100%", lg: "50%"}}}>
                <PaginatedAssociationTable
                  title="Associated Delivery Locations"
                  procedure="customerdeliverylocations.getAllPage"
                  customerId={customerId}
                  initialCount={dlcount}
                  orderBy="DeliveryLocationID"
                  emptyMessage="No delivery locations on file for this customer."
                  headCells={["Last used", "Location", "Times used"]}
                  getRowKey={(row) => String(row.DeliveryLocationID)}
                  renderCells={(row) => {
                    const deliveryLocations = row.DeliveryLocations as
                      | {Description?: string}
                      | undefined;
                    return (
                      <>
                        <TableCell>{formatAssociationDate(row.lastUsed)}</TableCell>
                        <TableCell>
                          {deliveryLocations?.Description ?? "—"}
                        </TableCell>
                        <TableCell align="right">{String(row.useCount ?? 0)}</TableCell>
                      </>
                    );
                  }}
                />
              </Grid2>
            </Grid2>
          </Grid2>
        )}
        {tabValue === 1 && (
          <GenericTable
            trpcQuery="invoices.getAllPage"
            trpcInput={invoiceTableInput}
            resultShape="paginated"
            initialRows={invoices as InvoicesType[]}
            initialCount={icount}
            defaultOrderBy="ID"
            defaultOrder="desc"
            columns={columns}
            overrides={overrides}
          />
        )}
        {tabValue === 2 && (
          <GenericTable
            trpcQuery="loads.getAllPage"
            trpcInput={loadTableInput}
            resultShape="paginated"
            initialRows={loads as Loads[]}
            initialCount={lcount}
            defaultOrderBy="ID"
            defaultOrder="desc"
            columns={lcolumns}
            overrides={loverrides}
          />
        )}
      </Grid2>
    </Grid2>
  );
};

export default Customer;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id;

  let initialCustomer;

  let invoices: (Invoices & { Customers: { Name: string }; Loads?: Loads[] })[] = [];

  let loads: (Loads & {
    Customers: { Name: string } | null;
    DeliveryLocations: { Description: string } | null;
    Drivers: { FirstName: string; LastName: string } | null;
    LoadTypes: { Description: string } | null;
    Trucks: { Name: string } | null;
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
        Customers: { select: { Name: true } },
      },
      take: 10,
      orderBy: {
        ID: "desc",
      },
      where: { AND: { CustomerID: parseInt(id) } },
    });

    loads = await prisma.loads.findMany({
      include: {
        Customers: { select: { Name: true } },
        Trucks: { select: { Name: true } },
        Drivers: { select: { FirstName: true, LastName: true } },
        LoadTypes: { select: { Description: true } },
        DeliveryLocations: { select: { Description: true } },
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

    dlcount = (
        await prisma.customerDeliveryLocations.groupBy({
            by: ["DeliveryLocationID"],
            where: {CustomerID: parseInt(id)},
        })
    ).length;

    ltcount = (
        await prisma.customerLoadTypes.groupBy({
            by: ["LoadTypeID"],
            where: {CustomerID: parseInt(id)},
        })
    ).length;
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
