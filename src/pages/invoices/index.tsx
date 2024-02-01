import React, { useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Invoice from "../../components/objects/Invoice";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { CustomersModel, InvoicesModel, LoadsModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { trpc } from "../../utils/trpc";
import BasicAutocomplete from "elements/Autocomplete";
import { TextField } from "@mui/material";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;

const columnsUnpaid: TableColumnsType = [
  { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: 'CustomerID' },
  { name: "Number" },
  { name: "InvoiceDate", as: "Invoice Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "Printed" },
  { name: "ID", as: "", navigateTo: "/invoices/" },
];

const overridesUnpaid: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Customers.Name", type: "link" },
  { name: "Printed", type: "checkbox" },
  { name: "InvoiceDate", type: "date" },
];

const columnsPaid: TableColumnsType = [
  { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: 'CustomerID' },
  { name: "Number" },
  { name: "InvoiceDate", as: "Invoice Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "PaidDate", as: "Date Paid" },
  { name: "Paid" },
  { name: "Printed" },
  { name: "PaymentType", as: "Payment Type" },
  { name: "ID", as: "", navigateTo: "/invoices/" },
];

const overridesPaid: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Customers.Name", type: "link" },
  { name: "Paid", type: "checkbox" },
  { name: "Printed", type: "checkbox" },
  { name: "PaidDate", type: "date" },
  { name: "InvoiceDate", type: "date" },
];

const columnsAll: TableColumnsType = [
  { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: 'CustomerID' },
  { name: "Number" },
  { name: "InvoiceDate", as: "Invoice Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "PaidDate", as: "Date Paid" },
  { name: "Paid" },
  { name: "Printed" },
  { name: "PaymentType", as: "Payment Type" },
  { name: "ID", as: "", navigateTo: "/invoices/" },
];

const overridesAll: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Customers.Name", type: "link" },
  { name: "Paid", type: "checkbox" },
  { name: "Printed", type: "checkbox" },
  { name: "PaidDate", type: "date" },
  { name: "InvoiceDate", type: "date" },
];

const Invoices = ({
  invoicesUnpaid,
  invoicesPaid,
  invoicesAll,
  customers,
  lastInvoice,
  countUnpaid,
  countPaid,
  countAll,
}: {
  invoicesUnpaid: InvoicesType[];
  invoicesPaid: InvoicesType[];
  invoicesAll: InvoicesType[];
  customers: CustomersType[];
  lastInvoice: number;
  countUnpaid: number;
  countPaid: number;
  countAll: number;
}) => {
  const [unpaidData, setUnpaidData] = useState<InvoicesType[]>([]);
  const [paidData, setPaidData] = useState<InvoicesType[]>([]);
  const [trpcData, setData] = useState<InvoicesType[]>([]);

  const [shouldRefresh, setShouldRefresh] = useState(false);

  const [customer, setCustomer] = useState(0);

  const [search, setSearch] = useState<number | null>(null);

  const [tabValue, setTabValue] = React.useState(0);

  const [newCount, setNewCount] = useState(0);

  const [page, setPage] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setPage(0);
    setCustomer(0);
    setSearch(null);
    setShouldRefresh(true);
    setTabValue(newValue);
  };

  //TODO could probably consolidate calls and filter/parse on frontend if needed

  const [order, setOrder] = React.useState<'asc'|'desc'>('desc');
  const [orderBy, setOrderBy] = React.useState('ID')

  trpc.useQuery(["invoices.getAllUnpaid", { customer, search, page, orderBy, order }], {
    enabled: shouldRefresh,
    onSuccess(data) {
      setUnpaidData(JSON.parse(JSON.stringify(data)));
      setShouldRefresh(false);
    },
    onError(error) {
      console.warn(error.message);
      setShouldRefresh(false);
    },
  });

  trpc.useQuery(["invoices.getAllPaid", { customer, search, page, orderBy, order }], {
    enabled: shouldRefresh,
    onSuccess(data) {
      setPaidData(JSON.parse(JSON.stringify(data)));
      setShouldRefresh(false);
    },
    onError(error) {
      console.warn(error.message);
      setShouldRefresh(false);
    },
  });

  trpc.useQuery(["invoices.getAll", { customer, search, page, orderBy, order }], {
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

  trpc.useQuery(["invoices.getCount", { customer, search, tabValue }], {
    enabled: shouldRefresh,
    onSuccess(data) {
      setNewCount(data);
      setShouldRefresh(false);
    },
    onError(error) {
      console.warn(error.message);
      setShouldRefresh(false);
    },
  });

  const filterBody = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <b style={{ textAlign: "center" }}>Specify Search Terms</b>
      <div
        style={{
          paddingBottom: 5,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <div style={{ width: "68%" }}>
          <BasicAutocomplete
            optionLabel={"Name+|+Street+,+City"}
            optionValue={"ID"}
            searchQuery={"customers"}
            label={"Customer"}
            defaultValue={null}
            onSelect={(customer: any) => {
              setCustomer(customer);
            }}
          />
        </div>
        <div style={{ width: "30%" }}>
          <TextField
            label={"Number/Total"}
            fullWidth
            type={"number"}
            size={"small"}
            onChange={(e) => {
              setSearch(parseFloat(e.currentTarget.value));
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingBottom: 5,
        }}
      >
        <div style={{ width: "48%" }}></div>
        <div style={{ width: "48%" }}></div>
      </div>
    </div>
  );

  return (
    <Grid2 container>
      <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", paddingBottom: 1 }}>
          <Tabs value={tabValue} onChange={handleChange}>
            <Tab label="Unpaid" />
            <Tab label="Paid" />
            <Tab label="All" />
          </Tabs>
        </Box>
        {/*<Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Invoices'}/>
                </Grid2>*/}
        {tabValue === 0 && (
          <GenericTable
            data={customer || search || (order !== 'desc' || orderBy !== 'ID') ? unpaidData : invoicesUnpaid}
            columns={columnsUnpaid}
            overrides={overridesUnpaid}
            count={customer || search ? newCount : countUnpaid}
            filterBody={filterBody}
            doSearch={() => {
              setPage(0);
              setShouldRefresh(true);
            }}
            refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc'|'desc') => {
              setPage(page);
              setOrderBy(orderBy);
              setOrder(order);
              setShouldRefresh(true);
            }}
            clearFilter={() => {
              setPage(0);
              setCustomer(0);
              setSearch(null);
              setShouldRefresh(true);
            }}
          />
        )}

        {tabValue === 1 && (
          <GenericTable
            data={customer || search || (order !== 'desc' || orderBy !== 'ID') ? paidData : invoicesPaid}
            columns={columnsPaid}
            overrides={overridesPaid}
            count={customer || search ? newCount : countPaid}
            filterBody={filterBody}
            doSearch={() => {
              setPage(0);
              setShouldRefresh(true);
            }}
            refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc'|'desc') => {
              setPage(page);
              setOrderBy(orderBy);
              setOrder(order);
              setShouldRefresh(true);
            }}
            clearFilter={() => {
              setPage(0);
              setCustomer(0);
              setSearch(null);
              setShouldRefresh(true);
            }}
          />
        )}

        {tabValue === 2 && (
          <GenericTable
            data={customer || search || (order !== 'desc' || orderBy !== 'ID') ? trpcData : invoicesAll}
            columns={columnsAll}
            overrides={overridesAll}
            count={customer || search ? newCount : countAll}
            filterBody={filterBody}
            doSearch={() => {
              setPage(0);
              setShouldRefresh(true);
            }}
            refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc'|'desc') => {
              setPage(page);
              setOrderBy(orderBy);
              setOrder(order);
              setShouldRefresh(true);
            }}
            clearFilter={() => {
              setPage(0);
              setCustomer(0);
              setSearch(null);
              setShouldRefresh(true);
            }}
          />
        )}
      </Grid2>
      <Divider
        flexItem={true}
        orientation={"vertical"}
        sx={{ mr: "-1px" }}
        variant={"fullWidth"}
      />
      <Grid2 xs={4}>
        <Invoice
          customers={customers}
          refreshData={() => {
            setShouldRefresh(true);
          }}
          lastInvoice={lastInvoice}
        />
      </Grid2>
    </Grid2>
  );
};

export default Invoices;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const countAll = await prisma.invoices.count();
  const countUnpaid = await prisma.invoices.count({ where: { Paid: false } });
  const countPaid = await prisma.invoices.count({ where: { Paid: true } });

  const lastInvoice = await prisma.invoices.aggregate({
    _max: {
      Number: true,
    },
  });

  const invoicesAll = await prisma.invoices.findMany({
    include: {
      Customers: true,
      Loads: true,
    },
    take: 10,
    orderBy: {
      ID: "desc",
    },
  });

  const invoicesUnpaid = await prisma.invoices.findMany({
    where: {
      Paid: false,
    },
    include: {
      Customers: true,
      Loads: true,
    },
    take: 10,
    orderBy: {
      ID: "desc",
    },
  });

  const invoicesPaid = await prisma.invoices.findMany({
    where: {
      Paid: true,
    },
    include: {
      Customers: true,
      Loads: true,
    },
    take: 10,
    orderBy: {
      ID: "desc",
    },
  });

  const customers = await prisma.customers.findMany({ take: 10 });

  return {
    props: {
      invoicesAll: JSON.parse(JSON.stringify(invoicesAll)),
      invoicesUnpaid: JSON.parse(JSON.stringify(invoicesUnpaid)),
      invoicesPaid: JSON.parse(JSON.stringify(invoicesPaid)),
      countAll,
      countUnpaid,
      countPaid,
      customers,
      lastInvoice: (lastInvoice?._max.Number ?? 0) + 1,
    },
  };
};
