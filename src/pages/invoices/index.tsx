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
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Close from "@mui/icons-material/Close";
import { toast } from "react-toastify";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;

const columnsUnpaid: TableColumnsType = [
  {
    name: "Customers.Name",
    as: "Customer",
    navigateTo: "customers/[ID]",
    column: "CustomerID",
  },
  { name: "Number" },
  { name: "InvoiceDate", as: "Invoice Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "Printed" },
  {
    name: "ConsolidatedID",
    as: "Consolidated ID",
    align: "right",
    navigateTo: "invoices/[ID]",
    column: "ConsolidatedID",
  },
  { name: "ID", as: "", navigateTo: "/invoices/" },
];

const columnsConsolidatedSelect: TableColumnsType = [
  {
    name: "Customers.Name",
    as: "Customer",
    navigateTo: "customers/[ID]",
    column: "CustomerID",
  },
  { name: "Number" },
  { name: "InvoiceDate", as: "Invoice Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "Printed", align: "left" },
  { name: "Consolidated", as: "Selected", align: "right" },
];

const columnsConsolidated: TableColumnsType = [
  {
    name: "Customers.Name",
    as: "Customer",
    navigateTo: "customers/[ID]",
    column: "CustomerID",
  },
  { name: "Number" },
  { name: "InvoiceDate", as: "Invoice Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "PaidDate", as: "Date Paid" },
  { name: "Printed", align: "left" },
  { name: "ID", as: "", navigateTo: "/invoices/" },
];

const overridesConsolidated: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Customers.Name", type: "link" },
  { name: "Printed", type: "checkbox" },
  { name: "PaidDate", type: "date" },
  { name: "InvoiceDate", type: "date" },
];

const overridesUnpaid: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Customers.Name", type: "link" },
  { name: "Printed", type: "checkbox" },
  { name: "InvoiceDate", type: "date" },
  { name: "Consolidated", type: "checkbox" },
  { name: "ConsolidatedID", type: "link" },
];

const columnsPaid: TableColumnsType = [
  {
    name: "Customers.Name",
    as: "Customer",
    navigateTo: "customers/[ID]",
    column: "CustomerID",
  },
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
  {
    name: "Customers.Name",
    as: "Customer",
    navigateTo: "customers/[ID]",
    column: "CustomerID",
  },
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
  invoicesConsolidated,
  customers,
  lastInvoice,
  countUnpaid,
  countPaid,
  countAll,
  countConsolidated,
}: {
  invoicesUnpaid: InvoicesType[];
  invoicesPaid: InvoicesType[];
  invoicesAll: InvoicesType[];
  invoicesConsolidated: InvoicesType[];
  customers: CustomersType[];
  lastInvoice: number;
  countUnpaid: number;
  countPaid: number;
  countAll: number;
  countConsolidated: number;
}) => {
  const [unpaidData, setUnpaidData] = useState<InvoicesType[]>([]);
  const [paidData, setPaidData] = useState<InvoicesType[]>([]);
  const [consolidatedData, setConsolidatedData] = useState<InvoicesType[]>([]);
  const [trpcData, setData] = useState<InvoicesType[]>([]);

  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [consolidatedShouldRefresh, setConsolidatedShouldRefresh] =
    useState(false);

  const [customer, setCustomer] = useState(0);
  const [consolidateCustomer, setConsolidateCustomer] = useState(0);
  const [consolidateableInvoices, setConsolidateableInvoices] = React.useState<
    InvoicesType[]
  >([]);

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

  const overridesConsolidatedSelect: TableColumnOverridesType = [
    {
      name: "Consolidated",
      type: "checkbox-action",
      callback: handleInvoiceSelect,
    },
    { name: "Customers.Name", type: "link" },
    { name: "Printed", type: "checkbox" },
    { name: "InvoiceDate", type: "date" },
  ];

  function handleInvoiceSelect(item: InvoicesType) {
    const newConsolidated = consolidateableInvoices.map((_item) => {
      if (_item.ID === item.ID) {
        _item.Consolidated = !_item.Consolidated;
      }
      return _item;
    });
    setConsolidateableInvoices(newConsolidated);
  }

  //TODO could probably consolidate calls and filter/parse on frontend if needed

  const [order, setOrder] = React.useState<"asc" | "desc">("desc");
  const [orderBy, setOrderBy] = React.useState("ID");
  const [modal, toggleModal] = React.useState(false);
  const [key, setNewKey] = React.useState(Math.random());

  trpc.useQuery(
    ["invoices.getAllUnpaid", { customer, search, page, orderBy, order }],
    {
      enabled: shouldRefresh && tabValue === 0,
      onSuccess(data) {
        setUnpaidData(JSON.parse(JSON.stringify(data)));
        setNewKey(Math.random());
        setShouldRefresh(false);
      },
      onError(error) {
        console.warn(error.message);
        setShouldRefresh(false);
      },
    }
  );

  trpc.useQuery(
    ["invoices.getAllConsolidated", { customer, search, page, orderBy, order }],
    {
      enabled: shouldRefresh && tabValue === 3,
      onSuccess(data) {
        setConsolidatedData(JSON.parse(JSON.stringify(data)));
        setNewKey(Math.random());
        setShouldRefresh(false);
      },
      onError(error) {
        console.warn(error.message);
        setShouldRefresh(false);
      },
    }
  );

  trpc.useQuery(
    [
      "invoices.getAllConsolidateable",
      {
        customer: consolidateCustomer,
        page,
        orderBy,
        order,
      },
    ],
    {
      enabled: consolidatedShouldRefresh,
      onSuccess(data) {
        setConsolidateableInvoices(JSON.parse(JSON.stringify(data)));
        setNewKey(Math.random());
        setConsolidatedShouldRefresh(false);
      },
      onError(error) {
        console.warn(error.message);
        setConsolidatedShouldRefresh(false);
      },
    }
  );

  trpc.useQuery(
    ["invoices.getAllPaid", { customer, search, page, orderBy, order }],
    {
      enabled: shouldRefresh && tabValue === 1,
      onSuccess(data) {
        setPaidData(JSON.parse(JSON.stringify(data)));
        setNewKey(Math.random());
        setShouldRefresh(false);
      },
      onError(error) {
        console.warn(error.message);
        setShouldRefresh(false);
      },
    }
  );

  trpc.useQuery(
    ["invoices.getAll", { customer, search, page, orderBy, order }],
    {
      enabled: shouldRefresh && tabValue === 2,
      onSuccess(data) {
        setData(JSON.parse(JSON.stringify(data)));
        setNewKey(Math.random());
        setShouldRefresh(false);
      },
      onError(error) {
        console.warn(error.message);
        setShouldRefresh(false);
      },
    }
  );

  trpc.useQuery(["invoices.getCount", { customer, search, tabValue }], {
    enabled: shouldRefresh,
    onSuccess(data) {
      setNewCount(data);
      setNewKey(Math.random());
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

  const createConsolidated = trpc.useMutation("invoices.putConsolidated", {
    async onSuccess(data) {
      toast("Successfully Submitted!", { autoClose: 2000, type: "success" });
    },
  });

  return (
    <Grid2 container>
      <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            paddingBottom: 1,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Tabs value={tabValue} onChange={handleChange}>
            <Tab label="Unpaid" />
            <Tab label="Paid" />
            <Tab label="All" />
            <Tab label="Consolidated" />
          </Tabs>
          <Button
            type={"button"}
            variant={"contained"}
            style={{
              backgroundColor: "#FFA726",
              alignSelf: "flex-end",
              height: 32,
            }}
            onClick={() => {
              toggleModal(true);
            }}
          >
            Create Consolidated
          </Button>
        </Box>
        {/*<Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Invoices'}/>
                </Grid2>*/}
        {tabValue === 0 && (
          <GenericTable
            data={
              customer ||
              search ||
              order !== "desc" ||
              orderBy !== "ID" ||
              (unpaidData.length !== 0)
                ? unpaidData
                : invoicesUnpaid
            }
            columns={columnsUnpaid}
            overrides={overridesUnpaid}
            count={customer || search ? newCount : countUnpaid}
            filterBody={filterBody}
            searchSet={(customer !== 0 && customer !== undefined && customer !== null) || (search !== null)}
            doSearch={() => {
              setPage(0);
              setShouldRefresh(true);
            }}
            refreshData={(
              page: React.SetStateAction<number>,
              orderBy: string,
              order: "asc" | "desc"
            ) => {
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
            data={
              customer ||
              search ||
              order !== "desc" ||
              orderBy !== "ID" ||
              (paidData.length !== 0)
                ? paidData
                : invoicesPaid
            }
            columns={columnsPaid}
            overrides={overridesPaid}
            count={customer || search ? newCount : countPaid}
            filterBody={filterBody}
            searchSet={(customer !== 0 && customer !== undefined && customer !== null) || (search !== null)}
            doSearch={() => {
              setPage(0);
              setShouldRefresh(true);
            }}
            refreshData={(
              page: React.SetStateAction<number>,
              orderBy: string,
              order: "asc" | "desc"
            ) => {
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
            data={
              customer ||
              search ||
              order !== "desc" ||
              orderBy !== "ID" ||
              (trpcData.length !== 0)
                ? trpcData
                : invoicesAll
            }
            columns={columnsAll}
            overrides={overridesAll}
            count={customer || search ? newCount : countAll}
            filterBody={filterBody}
            searchSet={(customer !== 0 && customer !== undefined && customer !== null) || (search !== null)}
            doSearch={() => {
              setPage(0);
              setShouldRefresh(true);
            }}
            refreshData={(
              page: React.SetStateAction<number>,
              orderBy: string,
              order: "asc" | "desc"
            ) => {
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

        {tabValue === 3 && (
          <GenericTable
            data={
              customer ||
              search ||
              order !== "desc" ||
              orderBy !== "ID" ||
              (consolidatedData.length !== 0)
                ? consolidatedData
                : invoicesConsolidated
            }
            columns={columnsConsolidated}
            overrides={overridesConsolidated}
            count={customer || search ? newCount : countConsolidated}
            filterBody={filterBody}
            searchSet={(customer !== 0 && customer !== undefined && customer !== null) || (search !== null)}
            doSearch={() => {
              setPage(0);
              setShouldRefresh(true);
            }}
            refreshData={(
              page: React.SetStateAction<number>,
              orderBy: string,
              order: "asc" | "desc"
            ) => {
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

      <Modal
        open={modal}
        onClose={() => {
          toggleModal(false);
          setCustomer(0);
          setConsolidateableInvoices([]);
          setPage(0);
          setOrderBy("ID");
          setOrder("desc");
        }}
      >
        <Box sx={style}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <b style={{ textAlign: "center" }}>
              Select Unpaid Invoices to Consolidate
            </b>
            <div
              style={{
                paddingBottom: 5,
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <div style={{ width: "48%" }}>
                <BasicAutocomplete
                  optionLabel={"Name+|+Street+,+City"}
                  optionValue={"ID"}
                  searchQuery={"customers"}
                  label={"Customer"}
                  defaultValue={null}
                  onSelect={(customer: any) => {
                    setConsolidateCustomer(customer);
                    setConsolidatedShouldRefresh(true);
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

          <GenericTable
            data={consolidateableInvoices}
            columns={columnsConsolidatedSelect}
            overrides={overridesConsolidatedSelect}
            count={consolidateableInvoices.length}
            refreshData={(
              page: React.SetStateAction<number>,
              orderBy: string,
              order: "asc" | "desc"
            ) => {
              setPage(page);
              setOrderBy(orderBy);
              setOrder(order);
              setConsolidatedShouldRefresh(true);
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: "5px",
            }}
          >
            <Button
              variant={"contained"}
              color={"primary"}
              style={{ backgroundColor: "#1565C0" }}
              disabled={consolidateableInvoices.length === 0}
              onClick={async () => {
                await createConsolidated.mutateAsync({
                  ids: consolidateableInvoices
                    .filter((item) => item.Consolidated)
                    .map((item) => item.ID),
                });

                toggleModal(false);
                setCustomer(0);
                setConsolidateableInvoices([]);
                setPage(0);
                setOrderBy("ID");
                setOrder("desc");
                setShouldRefresh(true);
              }}
            >
              Create
            </Button>
            <Button
              variant={"contained"}
              color={"primary"}
              style={{ backgroundColor: "#757575" }}
              onClick={() => {
                toggleModal(false);
                setCustomer(0);
                setConsolidateableInvoices([]);
                setPage(0);
                setOrderBy("ID");
                setOrder("desc");
              }}
            >
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>
    </Grid2>
  );
};

export default Invoices;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const countAll = await prisma.invoices.count();
  const countUnpaid = await prisma.invoices.count({
    where: {
      OR: [{ Paid: false }, { Paid: null }],
      AND: { Consolidated: false },
    },
  });
  const countPaid = await prisma.invoices.count({ where: { Paid: true } });
  const countConsolidated = await prisma.invoices.count({
    where: {
      OR: [{ Paid: false }, { Paid: null }],
      AND: { Consolidated: true },
    },
  });

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
      OR: [{ Paid: false }, { Paid: null }],
      AND: { Consolidated: false },
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

  const invoicesConsolidated = await prisma.invoices.findMany({
    where: {
      OR: [{ Paid: false }, { Paid: null }],
      AND: { Consolidated: true },
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
      invoicesConsolidated: JSON.parse(JSON.stringify(invoicesConsolidated)),
      countAll,
      countUnpaid,
      countPaid,
      countConsolidated,
      customers,
      lastInvoice: (lastInvoice?._max.Number ?? 0) + 1,
    },
  };
};

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "75vw",
  height: "90vh",
  bgcolor: "white",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  overflowY: "auto",
};
