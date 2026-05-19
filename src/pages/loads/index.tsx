import React, { useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Load from "../../components/objects/Load";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { LoadsModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, {
  GenericTableHandle,
  TableFilterMatchMode,
} from "../../elements/GenericTable";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useTableFilters } from "../../utils/useTableFilters";

type LoadsType = z.infer<typeof LoadsModel>;

const columns: TableColumnsType = [
  { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: "CustomerID" },
  { name: "StartDate", as: "Start Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "LoadTypes.Description", as: "Load Type", column: "LoadTypeID" },
  { name: "DeliveryLocations.Description", as: "Delivery Notes", column: "DeliveryLocationID" },
  { name: "TicketNumber", as: "Ticket #" },
  { name: "Invoiced" },
  { name: "ID", as: "", navigateTo: "/loads/" },
];

const overrides: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Customers.Name", type: "link" },
  { name: "StartDate", type: "date" },
  { name: "Invoiced", type: "checkbox" },
];

const uninvColumns: TableColumnsType = [
  { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: "CustomerID" },
  { name: "StartDate", as: "Start Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "LoadTypes.Description", as: "Load Type", column: "LoadTypeID" },
  { name: "DeliveryLocations.Description", as: "Delivery Notes", column: "DeliveryLocationID" },
  { name: "TicketNumber", as: "Ticket #" },
  { name: "ID", as: "", navigateTo: "/loads/" },
];

const uninvOverrides: TableColumnOverridesType = [
  { name: "ID", type: "button" },
  { name: "Customers.Name", type: "link" },
  { name: "StartDate", type: "date" },
];

const EMPTY_LOAD_FILTERS = {
  customer: 0,
  driver: 0,
  truck: 0,
  loadType: 0,
  deliveryLocation: 0,
  search: null as number | null,
  matchMode: "all" as TableFilterMatchMode,
};

const Loads = ({
  loads,
  uninvLoads,
  count,
  uninvCount,
}: {
  loads: LoadsType[];
  uninvLoads: LoadsType[];
  count: number;
  uninvCount: number;
}) => {
  const filters = useTableFilters(EMPTY_LOAD_FILTERS);
  const [tabValue, setTabValue] = useState(0);
  const allTableRef = useRef<GenericTableHandle>(null);
  const uninvTableRef = useRef<GenericTableHandle>(null);

  const applied = filters.applied;
  const tableQueryInput = {
    customer: applied.customer,
    driver: applied.driver,
    truck: applied.truck,
    loadType: applied.loadType,
    deliveryLocation: applied.deliveryLocation,
    search: applied.search,
    matchMode: applied.matchMode,
  };

  const draft = filters.draft;

  const filterBody = (
    <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ width: "100%", paddingBottom: 5 }}>
        <BasicAutocomplete
          optionLabel={"Name+|+Street+,+City"}
          optionValue={"ID"}
          searchQuery={"customers"}
          label={"Customer"}
          defaultValue={draft.customer || null}
          onSelect={(c: number) => filters.updateDraft("customer", c)}
        />
      </div>
      <div style={{ width: "100%", paddingBottom: 5 }}>
        <TextField label={"Ticket Number"} fullWidth type={"number"} size={"small"} value={draft.search ?? ""} onChange={(e) => { const raw = e.currentTarget.value; if (raw === "") { filters.updateDraft("search", null); return; } const n = parseFloat(raw); filters.updateDraft("search", Number.isFinite(n) ? n : null); }} />
      </div>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", paddingBottom: 5 }}>
        <div style={{ width: "48%" }}>
          <BasicAutocomplete optionLabel={"FirstName+LastName"} optionValue={"ID"} searchQuery={"drivers"} label={"Driver"} defaultValue={draft.driver || null} onSelect={(d: number) => filters.updateDraft("driver", d)} />
        </div>
        <div style={{ width: "48%" }}>
          <BasicAutocomplete optionLabel={"Name+|+Notes"} optionValue={"ID"} searchQuery={"trucks"} label={"Truck"} defaultValue={draft.truck || null} onSelect={(t: number) => filters.updateDraft("truck", t)} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", paddingBottom: 5 }}>
        <div style={{ width: "48%" }}>
          <BasicAutocomplete optionLabel={"Description"} optionValue={"ID"} searchQuery={"loadtypes"} label={"Load Type"} defaultValue={draft.loadType || null} onSelect={(lt: number) => filters.updateDraft("loadType", lt)} />
        </div>
        <div style={{ width: "48%" }}>
          <BasicAutocomplete optionLabel={"Description"} optionValue={"ID"} searchQuery={"deliverylocations"} label={"Delivery Location"} defaultValue={draft.deliveryLocation || null} onSelect={(dl: number) => filters.updateDraft("deliveryLocation", dl)} />
        </div>
      </div>
    </div>
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    filters.resetQuiet();
    setTabValue(newValue);
  };

  return (
    <Grid2 container wrap="nowrap">
      <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", paddingBottom: 1 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="All" />
            <Tab label="Uninvoiced" />
          </Tabs>
        </Box>

        {tabValue === 0 ? (
          <GenericTable
            key="loads-all"
            tableRef={allTableRef}
            trpcQuery="loads.getAllPage"
            trpcInput={tableQueryInput}
            resultShape="paginated"
            initialRows={loads}
            initialCount={count}
            defaultOrderBy="ID"
            defaultOrder="desc"
            remoteActive={filters.isActive}
            filterRevision={filters.revision}
            columns={columns}
            overrides={overrides}
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
            key="loads-uninvoiced"
            tableRef={uninvTableRef}
            trpcQuery="loads.getUninvPage"
            trpcInput={tableQueryInput}
            resultShape="paginated"
            initialRows={uninvLoads}
            initialCount={uninvCount}
            defaultOrderBy="StartDate"
            defaultOrder="asc"
            remoteActive={filters.isActive}
            filterRevision={filters.revision}
            columns={uninvColumns}
            overrides={uninvOverrides}
            filterBody={filterBody}
            searchSet={filters.isActive}
            matchMode={draft.matchMode}
            onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
            onApplyFilters={filters.apply}
            onClearFilters={filters.clear}
          />
        ) : null}
      </Grid2>

      <Divider flexItem orientation="vertical" sx={{ mr: "-1px" }} variant="fullWidth" />

      <Grid2 xs={4}>
        <Load
          refreshData={() => {
            allTableRef.current?.refresh();
            uninvTableRef.current?.refresh();
          }}
        />
      </Grid2>
    </Grid2>
  );
};

export default Loads;

export const getServerSideProps: GetServerSideProps = async () => {
  const loadInclude = {
    Customers: true,
    Trucks: true,
    Drivers: true,
    LoadTypes: true,
    DeliveryLocations: true,
  } as const;

  const activeLoadWhere = {
    OR: [{ Deleted: false }, { Deleted: null }],
  };
  const uninvWhere = { ...activeLoadWhere, Invoiced: null as null };

  const [count, uninvCount, loads, uninvLoads] = await Promise.all([
    prisma.loads.count({ where: activeLoadWhere }),
    prisma.loads.count({ where: uninvWhere }),
    prisma.loads.findMany({
      include: loadInclude,
      where: activeLoadWhere,
      take: 10,
      orderBy: { ID: "desc" },
    }),
    prisma.loads.findMany({
      include: loadInclude,
      where: uninvWhere,
      take: 10,
      orderBy: { StartDate: "asc" },
    }),
  ]);

  return {
    props: {
      loads: JSON.parse(JSON.stringify(loads)),
      uninvLoads: JSON.parse(JSON.stringify(uninvLoads)),
      count,
      uninvCount,
    },
  };
};
