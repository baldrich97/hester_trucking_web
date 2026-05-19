import React, {useRef, useState} from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Invoice from "../../components/objects/Invoice";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import {InvoicesModel} from "../../../prisma/zod";
import {z} from "zod";
import GenericTable, {
  GenericTableHandle,
  TableFilterMatchMode,
} from "../../elements/GenericTable";
import Divider from "@mui/material/Divider";
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import {trpc} from "../../utils/trpc";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import {toast} from "react-toastify";
import { useTableFilters } from "../../utils/useTableFilters";

type InvoicesType = z.infer<typeof InvoicesModel>;
const columnsUnpaid: TableColumnsType = [
    {
        name: "Customers.Name",
        as: "Customer",
        navigateTo: "customers/[ID]",
        column: "CustomerID",
    },
    {name: "Number"},
    {name: "InvoiceDate", as: "Invoice Date"},
    {name: "TotalAmount", as: "Total Amount"},
    {name: "Printed"},
    {
        name: "ConsolidatedID",
        as: "Consolidated ID",
        align: "right",
        navigateTo: "invoices/[ID]",
        column: "ConsolidatedID",
    },
    {name: "ID", as: "", navigateTo: "/invoices/"},
];

const columnsConsolidatedSelect: TableColumnsType = [
    {
        name: "Customers.Name",
        as: "Customer",
        navigateTo: "customers/[ID]",
        column: "CustomerID",
    },
    {name: "Number"},
    {name: "InvoiceDate", as: "Invoice Date"},
    {name: "TotalAmount", as: "Total Amount"},
    {name: "Printed", align: "left"},
    {name: "Consolidated", as: "Selected", align: "right"},
];

const columnsConsolidated: TableColumnsType = [
    {
        name: "Customers.Name",
        as: "Customer",
        navigateTo: "customers/[ID]",
        column: "CustomerID",
    },
    {name: "Number"},
    {name: "InvoiceDate", as: "Invoice Date"},
    {name: "TotalAmount", as: "Total Amount"},
    {name: "PaidDate", as: "Date Paid"},
    {name: "Printed", align: "left"},
    {name: "ID", as: "", navigateTo: "/invoices/"},
];

const overridesConsolidated: TableColumnOverridesType = [
    {name: "ID", type: "button"},
    {name: "Customers.Name", type: "link"},
    {name: "Printed", type: "checkbox"},
    {name: "PaidDate", type: "date"},
    {name: "InvoiceDate", type: "date"},
];

const overridesUnpaid: TableColumnOverridesType = [
    {name: "ID", type: "button"},
    {name: "Customers.Name", type: "link"},
    {name: "Printed", type: "checkbox"},
    {name: "InvoiceDate", type: "date"},
    {name: "Consolidated", type: "checkbox"},
    {name: "ConsolidatedID", type: "link"},
];

const columnsPaid: TableColumnsType = [
    {
        name: "Customers.Name",
        as: "Customer",
        navigateTo: "customers/[ID]",
        column: "CustomerID",
    },
    {name: "Number"},
    {name: "InvoiceDate", as: "Invoice Date"},
    {name: "TotalAmount", as: "Total Amount"},
    {name: "PaidDate", as: "Date Paid"},
    {name: "Paid"},
    {name: "Printed"},
    {name: "PaymentType", as: "Payment Type"},
    {name: "ID", as: "", navigateTo: "/invoices/"},
];

const overridesPaid: TableColumnOverridesType = [
    {name: "ID", type: "button"},
    {name: "Customers.Name", type: "link"},
    {name: "Paid", type: "checkbox"},
    {name: "Printed", type: "checkbox"},
    {name: "PaidDate", type: "date"},
    {name: "InvoiceDate", type: "date"},
];

const columnsAll: TableColumnsType = [
    {
        name: "Customers.Name",
        as: "Customer",
        navigateTo: "customers/[ID]",
        column: "CustomerID",
    },
    {name: "Number"},
    {name: "InvoiceDate", as: "Invoice Date"},
    {name: "TotalAmount", as: "Total Amount"},
    {name: "PaidDate", as: "Date Paid"},
    {name: "Paid"},
    {name: "Printed"},
    {name: "PaymentType", as: "Payment Type"},
    {name: "ID", as: "", navigateTo: "/invoices/"},
];

const overridesAll: TableColumnOverridesType = [
    {name: "ID", type: "button"},
    {name: "Customers.Name", type: "link"},
    {name: "Paid", type: "checkbox"},
    {name: "Printed", type: "checkbox"},
    {name: "PaidDate", type: "date"},
    {name: "InvoiceDate", type: "date"},
];

const EMPTY_INVOICE_FILTERS = {
    customer: 0,
    loadType: 0,
    deliveryLocation: 0,
    search: null as number | null,
    matchMode: "all" as TableFilterMatchMode,
};

const Invoices = ({
                      invoicesUnpaid,
                      invoicesPaid,
                      invoicesAll,
                      invoicesConsolidated,
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
    lastInvoice: number;
    countUnpaid: number;
    countPaid: number;
    countAll: number;
    countConsolidated: number;
}) => {
    // Draft/applied split — the filter modal binds to `filters.draft` (survives
    // close/reopen); the trpc queries key off `filters.applied` so the visible
    // table doesn't change until the user clicks Apply.
    const filters = useTableFilters(EMPTY_INVOICE_FILTERS);
    const draft = filters.draft;
    const applied = filters.applied;

    const unpaidTableRef = useRef<GenericTableHandle>(null);
    const paidTableRef = useRef<GenericTableHandle>(null);
    const allTableRef = useRef<GenericTableHandle>(null);
    const consolidatedTableRef = useRef<GenericTableHandle>(null);
    const consolidateModalTableRef = useRef<GenericTableHandle>(null);

    const [consolidateCustomer, setConsolidateCustomer] = useState(0);
    const [consolidateableInvoices, setConsolidateableInvoices] = React.useState<
        InvoicesType[]
    >([]);

    const [tabValue, setTabValue] = React.useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        filters.resetQuiet();
        setTabValue(newValue);
    };

    const tableQueryInput = {
        customer: applied.customer,
        search: applied.search,
        deliveryLocation: applied.deliveryLocation,
        loadType: applied.loadType,
        matchMode: applied.matchMode,
    };

    const refreshActiveTab = () => {
        unpaidTableRef.current?.refresh();
        paidTableRef.current?.refresh();
        allTableRef.current?.refresh();
        consolidatedTableRef.current?.refresh();
    };

    function handleInvoiceSelect(item: InvoicesType) {
        setConsolidateableInvoices((prev) =>
            prev.map((_item) =>
                _item.ID === item.ID
                    ? { ..._item, Consolidated: !_item.Consolidated }
                    : _item,
            ),
        );
    }

    const overridesConsolidatedSelect: TableColumnOverridesType = [
        {
            name: "Consolidated",
            type: "checkbox-action",
            callback: handleInvoiceSelect,
        },
        {name: "Customers.Name", type: "link"},
        {name: "Printed", type: "checkbox"},
        {name: "InvoiceDate", type: "date"},
    ];

    const [modal, toggleModal] = React.useState(false);

    // Inputs in the filter modal are bound to `filters.draft` so values survive
    // closing/reopening the modal — only an explicit Apply promotes them.
    const filterBody = (
        <div style={{display: "flex", flexDirection: "column"}}>
            <div
                style={{
                    paddingBottom: 5,
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                }}
            >
                <div style={{width: "68%"}}>
                    <BasicAutocomplete
                        optionLabel={"Name+|+Street+,+City"}
                        optionValue={"ID"}
                        searchQuery={"customers"}
                        label={"Customer"}
                        defaultValue={draft.customer || null}
                        onSelect={(c: any) => filters.updateDraft("customer", c)}
                    />
                </div>
                <div style={{width: "30%"}}>
                    <TextField
                        label={"Number/Total"}
                        fullWidth
                        type={"number"}
                        size={"small"}
                        value={draft.search ?? ""}
                        onChange={(e) => {
                            const raw = e.currentTarget.value;
                            if (raw === "") {
                                filters.updateDraft("search", null);
                                return;
                            }
                            const n = parseFloat(raw);
                            filters.updateDraft("search", Number.isFinite(n) ? n : null);
                        }}
                    />
                </div>
            </div>

            <div
                style={{
                    paddingBottom: 5,
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                }}
            >
                <div style={{width: "49%"}}>
                    <BasicAutocomplete
                        optionLabel={"Description"}
                        optionValue={"ID"}
                        searchQuery={"loadtypes"}
                        label={"Load Type"}
                        defaultValue={draft.loadType || null}
                        onSelect={(lt: any) => filters.updateDraft("loadType", lt)}
                    />
                </div>
                <div style={{width: "49%"}}>
                    <BasicAutocomplete
                        optionLabel={"Description"}
                        optionValue={"ID"}
                        searchQuery={"deliverylocations"}
                        label={"Delivery Location"}
                        defaultValue={draft.deliveryLocation || null}
                        onSelect={(dl: any) => filters.updateDraft("deliveryLocation", dl)}
                    />
                </div>
            </div>
        </div>
    );

  const createConsolidated = trpc.useMutation("invoices.putConsolidated", {
    async onSuccess(data) {
      toast("Successfully Submitted!", { autoClose: 2000, type: "success" });
    },
  });

  return (
      <Grid2 container wrap={'nowrap'}>
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
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Unpaid" />
            <Tab label="Paid" />
            <Tab label="All" />
            <Tab label="Consolidated" />
          </Tabs>
          <Button
            type="button"
            variant="contained"
            color="warning"
            sx={{alignSelf: "flex-end", height: 32}}
            onClick={() => {
              toggleModal(true);
            }}
          >
            Create Consolidated
          </Button>
        </Box>
                {tabValue === 0 ? (
                    <GenericTable
                        key="invoices-unpaid"
                        tableRef={unpaidTableRef}
                        trpcQuery="invoices.getAllUnpaidPage"
                        trpcInput={tableQueryInput}
                        resultShape="paginated"
                        initialRows={invoicesUnpaid}
                        initialCount={countUnpaid}
                        remoteActive={filters.isActive}
                        filterRevision={filters.revision}
                        columns={columnsUnpaid}
                        overrides={overridesUnpaid}
                        filterBody={filterBody}
                        searchSet={filters.isActive}
                        matchMode={draft.matchMode}
                        onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
                        onApplyFilters={filters.apply}
                        onClearFilters={filters.clear}
                    />
                ) : null}

                {tabValue === 1 ? (
                    <GenericTable
                        key="invoices-paid"
                        tableRef={paidTableRef}
                        trpcQuery="invoices.getAllPaidPage"
                        trpcInput={tableQueryInput}
                        resultShape="paginated"
                        initialRows={invoicesPaid}
                        initialCount={countPaid}
                        remoteActive={filters.isActive}
                        filterRevision={filters.revision}
                        columns={columnsPaid}
                        overrides={overridesPaid}
                        filterBody={filterBody}
                        searchSet={filters.isActive}
                        matchMode={draft.matchMode}
                        onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
                        onApplyFilters={filters.apply}
                        onClearFilters={filters.clear}
                    />
                ) : null}

                {tabValue === 2 ? (
                    <GenericTable
                        key="invoices-all"
                        tableRef={allTableRef}
                        trpcQuery="invoices.getAllPage"
                        trpcInput={tableQueryInput}
                        resultShape="paginated"
                        initialRows={invoicesAll}
                        initialCount={countAll}
                        remoteActive={filters.isActive}
                        filterRevision={filters.revision}
                        columns={columnsAll}
                        overrides={overridesAll}
                        filterBody={filterBody}
                        searchSet={filters.isActive}
                        matchMode={draft.matchMode}
                        onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
                        onApplyFilters={filters.apply}
                        onClearFilters={filters.clear}
                    />
                ) : null}

                {tabValue === 3 ? (
                    <GenericTable
                        key="invoices-consolidated"
                        tableRef={consolidatedTableRef}
                        trpcQuery="invoices.getAllConsolidatedPage"
                        trpcInput={tableQueryInput}
                        resultShape="paginated"
                        initialRows={invoicesConsolidated}
                        initialCount={countConsolidated}
                        remoteActive={filters.isActive}
                        filterRevision={filters.revision}
                        columns={columnsConsolidated}
                        overrides={overridesConsolidated}
                        filterBody={filterBody}
                        searchSet={filters.isActive}
                        matchMode={draft.matchMode}
                        onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
                        onApplyFilters={filters.apply}
                        onClearFilters={filters.clear}
                    />
                ) : null}
            </Grid2>
            <Divider
                flexItem={true}
                orientation={"vertical"}
                sx={{mr: "-1px"}}
                variant={"fullWidth"}
            />
            <Grid2 xs={4}>
                <Invoice
                    refreshData={refreshActiveTab}
                    lastInvoice={lastInvoice}
                />
            </Grid2>

            <Modal
                open={modal}
                onClose={() => {
                    toggleModal(false);
                    setConsolidateableInvoices([]);
                    setConsolidateCustomer(0);
                }}
            >
                <Box sx={style}>
                    <div style={{display: "flex", flexDirection: "column"}}>
                        <b style={{textAlign: "center"}}>
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
                            <div style={{width: "48%"}}>
                                <BasicAutocomplete
                                    optionLabel={"Name+|+Street+,+City"}
                                    optionValue={"ID"}
                                    searchQuery={"customers"}
                                    label={"Customer"}
                                    defaultValue={null}
                                    onSelect={(customer: number) => {
                                        setConsolidateCustomer(customer);
                                        setConsolidateableInvoices([]);
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
                            <div style={{width: "48%"}}></div>
                            <div style={{width: "48%"}}></div>
                        </div>
                    </div>

                    <GenericTable
                        tableRef={consolidateModalTableRef}
                        trpcQuery="invoices.getAllConsolidateable"
                        trpcInput={{ customer: consolidateCustomer }}
                        resultShape="array"
                        remoteActive={consolidateCustomer > 0}
                        columns={columnsConsolidatedSelect}
                        overrides={overridesConsolidatedSelect}
                        rowCount={consolidateableInvoices.length}
                        onRowsChange={setConsolidateableInvoices}
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
                            variant="contained"
                            color="primary"
                            disabled={consolidateableInvoices.length === 0}
                            onClick={async () => {
                                await createConsolidated.mutateAsync({
                                    ids: consolidateableInvoices
                                        .filter((item) => item.Consolidated)
                                        .map((item) => item.ID),
                                });

                                toggleModal(false);
                                setConsolidateableInvoices([]);
                                setConsolidateCustomer(0);
                                refreshActiveTab();
                            }}
                        >
                            Create
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => {
                                toggleModal(false);
                                setConsolidateableInvoices([]);
                                setConsolidateCustomer(0);
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
    const invoiceInclude = {Customers: true, Loads: true} as const;

    const [
        countAll,
        countUnpaid,
        countPaid,
        countConsolidated,
        lastInvoice,
        invoicesAll,
        invoicesUnpaid,
        invoicesConsolidated,
        invoicesPaid,
    ] = await Promise.all([
        prisma.invoices.count(),
        prisma.invoices.count({
            where: {
                OR: [{Paid: false}, {Paid: null}],
                AND: {Consolidated: false},
            },
        }),
        prisma.invoices.count({where: {Paid: true}}),
        prisma.invoices.count({
            where: {
                OR: [{Paid: false}, {Paid: null}],
                AND: {Consolidated: true},
            },
        }),
        prisma.invoices.aggregate({
            _max: {
                Number: true,
            },
        }),
        prisma.invoices.findMany({
            include: invoiceInclude,
            take: 10,
            orderBy: {
                ID: "desc",
            },
        }),
        prisma.invoices.findMany({
            where: {
                OR: [{Paid: false}, {Paid: null}],
                AND: {Consolidated: false},
            },
            include: invoiceInclude,
            take: 10,
            orderBy: {
                ID: "desc",
            },
        }),
        prisma.invoices.findMany({
            where: {
                OR: [{Paid: false}, {Paid: null}],
                AND: {Consolidated: true},
            },
            include: invoiceInclude,
            take: 10,
            orderBy: {
                ID: "desc",
            },
        }),
        prisma.invoices.findMany({
            where: {
                Paid: true,
            },
            include: invoiceInclude,
            take: 10,
            orderBy: {
                ID: "desc",
            },
        }),
    ]);

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
