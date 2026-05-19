import React, {useState} from "react";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import {InvoicesModel} from "../../../prisma/zod";
import {z} from "zod";
import GenericTable, { TableFilterMatchMode } from "../../elements/GenericTable";
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import {trpc} from "../../utils/trpc";
import { useTableFilters } from "../../utils/useTableFilters";

type InvoicesType = z.infer<typeof InvoicesModel>;

const columnsOverdue: TableColumnsType = [
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
    {name: "ConsolidatedID", as: "Consolidated ID", align: "right", navigateTo: "invoices/[ID]", column: "ConsolidatedID"},
    {name: "ID", as: "", navigateTo: "/invoices/"},
];

const overridesOverdue: TableColumnOverridesType = [
    {name: "ID", type: "button"},
    {name: "Customers.Name", type: "link"},
    {name: "Printed", type: "checkbox"},
    {name: "InvoiceDate", type: "date"},
    {name: "ConsolidatedID", type: "link"},
];

const EMPTY_OVERDUE_FILTERS = {
    customer: 0,
    loadType: 0,
    deliveryLocation: 0,
    search: null as number | null,
    matchMode: "all" as TableFilterMatchMode,
};

const OverdueInvoices = ({
    invoicesOverdue,
    countOverdue,
}: {
    invoicesOverdue: InvoicesType[];
    countOverdue: number;
}) => {
    // Draft/applied split — modal binds to `draft` and survives close/reopen;
    // queries key off `applied` so the table doesn't change behind the modal.
    const filters = useTableFilters(EMPTY_OVERDUE_FILTERS);
    const draft = filters.draft;
    const applied = filters.applied;

    const [data, setData] = useState<InvoicesType[]>([]);
    const [shouldRefresh, setShouldRefresh] = useState(false);
    const [newCount, setNewCount] = useState(0);

    const [page, setPage] = useState(0);
    const [order, setOrder] = useState<"asc" | "desc">("asc");
    const [orderBy, setOrderBy] = useState("InvoiceDate");

    const handleApply = () => {
        filters.apply();
        setPage(0);
        setShouldRefresh(true);
    };

    const handleClear = () => {
        filters.clear();
        setPage(0);
        setShouldRefresh(true);
    };

    trpc.useQuery(
        [
            "invoices.getAllOverdue",
            {
                customer: applied.customer,
                search: applied.search,
                page,
                orderBy,
                order,
                deliveryLocation: applied.deliveryLocation,
                loadType: applied.loadType,
                matchMode: applied.matchMode,
            },
        ],
        {
            enabled: shouldRefresh,
            onSuccess(responseData) {
                setData(JSON.parse(JSON.stringify(responseData)));
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
            "invoices.getOverdueFilteredCount",
            {
                customer: applied.customer,
                search: applied.search,
                deliveryLocation: applied.deliveryLocation,
                loadType: applied.loadType,
                matchMode: applied.matchMode,
            },
        ],
        {
            enabled: shouldRefresh,
            onSuccess(responseData) {
                setNewCount(responseData);
            },
            onError(error) {
                console.warn(error.message);
            },
        }
    );

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

    const useFetched =
        filters.isActive ||
        order !== "asc" ||
        orderBy !== "InvoiceDate" ||
        data.length !== 0;

    return (
        <Box>
            <h1 style={{marginTop: 0}}>Overdue Invoices</h1>
            <GenericTable
                data={useFetched ? data : invoicesOverdue}
                columns={columnsOverdue}
                overrides={overridesOverdue}
                count={filters.isActive ? newCount : countOverdue}
                page={page}
                filterBody={filterBody}
                searchSet={filters.isActive}
                matchMode={draft.matchMode}
                onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
                doSearch={handleApply}
                refreshData={(
                    nextPage: React.SetStateAction<number>,
                    nextOrderBy: string,
                    nextOrder: "asc" | "desc"
                ) => {
                    setPage(nextPage);
                    setOrderBy(nextOrderBy);
                    setOrder(nextOrder);
                    setShouldRefresh(true);
                }}
                clearFilter={handleClear}
            />
        </Box>
    );
};

export default OverdueInvoices;

export const getServerSideProps: GetServerSideProps = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);

    const where = {
        Paid: {not: true},
        InvoiceDate: {lte: cutoffDate},
        // Multi-tenant TODO: add CompanyID filter from session/company context.
        // CompanyID: activeCompanyId,
    };

    const countOverdue = await prisma.invoices.count({where});
    const invoicesOverdue = await prisma.invoices.findMany({
        where,
        include: {
            Customers: true,
            Loads: true,
        },
        take: 10,
        orderBy: {
            InvoiceDate: "asc",
        },
    });

    return {
        props: {
            invoicesOverdue: JSON.parse(JSON.stringify(invoicesOverdue)),
            countOverdue,
        },
    };
};
