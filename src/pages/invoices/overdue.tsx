import React from "react";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { InvoicesModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { TableFilterMatchMode } from "../../elements/GenericTable";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import { useTableFilters } from "../../utils/useTableFilters";

type InvoicesType = z.infer<typeof InvoicesModel>;

const columnsOverdue: TableColumnsType = [
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

const overridesOverdue: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Customers.Name", type: "link" },
  { name: "Printed", type: "checkbox" },
  { name: "InvoiceDate", type: "date" },
  { name: "ConsolidatedID", type: "link" },
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
  const filters = useTableFilters(EMPTY_OVERDUE_FILTERS);
  const draft = filters.draft;
  const applied = filters.applied;

  const tableQueryInput = {
    customer: applied.customer,
    search: applied.search,
    deliveryLocation: applied.deliveryLocation,
    loadType: applied.loadType,
    matchMode: applied.matchMode,
  };

  return (
    <Box>
      <h1 style={{ marginTop: 0 }}>Overdue Invoices</h1>
      <GenericTable
        trpcQuery="invoices.getAllOverduePage"
        trpcInput={tableQueryInput}
        resultShape="paginated"
        initialRows={invoicesOverdue}
        initialCount={countOverdue}
        defaultOrderBy="InvoiceDate"
        defaultOrder="asc"
        remoteActive={filters.isActive}
        filterRevision={filters.revision}
        columns={columnsOverdue}
        overrides={overridesOverdue}
        filterBody={
          <div style={{ display: "flex", flexDirection: "column" }}>
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
                  defaultValue={draft.customer || null}
                  onSelect={(c: number) => filters.updateDraft("customer", c)}
                />
              </div>
              <div style={{ width: "30%" }}>
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
              <div style={{ width: "49%" }}>
                <BasicAutocomplete
                  optionLabel={"Description"}
                  optionValue={"ID"}
                  searchQuery={"loadtypes"}
                  label={"Load Type"}
                  defaultValue={draft.loadType || null}
                  onSelect={(lt: number) => filters.updateDraft("loadType", lt)}
                />
              </div>
              <div style={{ width: "49%" }}>
                <BasicAutocomplete
                  optionLabel={"Description"}
                  optionValue={"ID"}
                  searchQuery={"deliverylocations"}
                  label={"Delivery Location"}
                  defaultValue={draft.deliveryLocation || null}
                  onSelect={(dl: number) => filters.updateDraft("deliveryLocation", dl)}
                />
              </div>
            </div>
          </div>
        }
        searchSet={filters.isActive}
        matchMode={draft.matchMode}
        onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
        onApplyFilters={filters.apply}
        onClearFilters={filters.clear}
      />
    </Box>
  );
};

export default OverdueInvoices;

export const getServerSideProps: GetServerSideProps = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 60);

  const where = {
    Paid: { not: true },
    InvoiceDate: { lte: cutoffDate },
  };

  const countOverdue = await prisma.invoices.count({ where });
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
