import React, {useState} from "react";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import {InvoicesModel} from "../../../prisma/zod";
import {z} from "zod";
import GenericTable from "../../elements/GenericTable";
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import {trpc} from "../../utils/trpc";

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

const OverdueInvoices = ({
    invoicesOverdue,
    countOverdue,
}: {
    invoicesOverdue: InvoicesType[];
    countOverdue: number;
}) => {
    const [data, setData] = useState<InvoicesType[]>([]);
    const [shouldRefresh, setShouldRefresh] = useState(false);
    const [newCount, setNewCount] = useState(0);

    const [customer, setCustomer] = useState(0);
    const [loadType, setLoadType] = useState(0);
    const [deliveryLocation, setDLocation] = useState(0);
    const [search, setSearch] = useState<number | null>(null);

    const [page, setPage] = useState(0);
    const [order, setOrder] = useState<"asc" | "desc">("asc");
    const [orderBy, setOrderBy] = useState("InvoiceDate");

    trpc.useQuery(
        ["invoices.getAllOverdue", {customer, search, page, orderBy, order, deliveryLocation, loadType}],
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
        ["invoices.getOverdueFilteredCount", {customer, search, deliveryLocation, loadType}],
        {
            enabled: shouldRefresh,
            onSuccess(responseData) {
                setNewCount(responseData);
                setShouldRefresh(false);
            },
            onError(error) {
                console.warn(error.message);
                setShouldRefresh(false);
            },
        }
    );

    const filterBody = (
        <div style={{display: "flex", flexDirection: "column"}}>
            <b style={{textAlign: "center"}}>Specify Search Terms</b>
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
                        defaultValue={null}
                        onSelect={(selectedCustomer: any) => {
                            setCustomer(selectedCustomer);
                        }}
                    />
                </div>
                <div style={{width: "30%"}}>
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
                        defaultValue={null}
                        onSelect={(selectedLoadType: any) => {
                            setLoadType(selectedLoadType);
                        }}
                    />
                </div>
                <div style={{width: "49%"}}>
                    <BasicAutocomplete
                        optionLabel={"Description"}
                        optionValue={"ID"}
                        searchQuery={"deliverylocations"}
                        label={"Delivery Location"}
                        defaultValue={null}
                        onSelect={(selectedLocation: any) => {
                            setDLocation(selectedLocation);
                        }}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <Box>
            <h1 style={{marginTop: 0}}>Overdue Invoices</h1>
            <GenericTable
                data={
                    customer ||
                    search ||
                    loadType ||
                    deliveryLocation ||
                    order !== "asc" ||
                    orderBy !== "InvoiceDate" ||
                    data.length !== 0
                        ? data
                        : invoicesOverdue
                }
                columns={columnsOverdue}
                overrides={overridesOverdue}
                count={customer || loadType || deliveryLocation || search ? newCount : countOverdue}
                filterBody={filterBody}
                searchSet={(customer !== 0 && customer !== undefined && customer !== null) || (search !== null)}
                doSearch={() => {
                    setPage(0);
                    setShouldRefresh(true);
                }}
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
                clearFilter={() => {
                    setPage(0);
                    setCustomer(0);
                    setLoadType(0);
                    setDLocation(0);
                    setSearch(null);
                    setShouldRefresh(true);
                }}
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
