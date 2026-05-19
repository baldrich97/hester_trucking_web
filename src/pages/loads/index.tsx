import React, { useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Load from "../../components/objects/Load";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import {LoadsModel} from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { TableFilterMatchMode } from "../../elements/GenericTable";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";
import { trpc } from "../../utils/trpc";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useTableFilters } from "../../utils/useTableFilters";

type LoadsType = z.infer<typeof LoadsModel>;

const columns: TableColumnsType = [
  { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: 'CustomerID' },
  { name: "StartDate", as: "Start Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "LoadTypes.Description", as: "Load Type", column: 'LoadTypeID'  },
  { name: "DeliveryLocations.Description", as: "Delivery Notes", column: 'DeliveryLocationID'  },
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
  { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: 'CustomerID' },
  { name: "StartDate", as: "Start Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "LoadTypes.Description", as: "Load Type", column: 'LoadTypeID'  },
  { name: "DeliveryLocations.Description", as: "Delivery Notes", column: 'DeliveryLocationID'  },
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
    uninvCount
}: {
  loads: LoadsType[];
  uninvLoads: LoadsType[];
  count: number;
  uninvCount: number;
}) => {
  // Two parallel filter snapshots: `draft` is bound to the modal inputs and
  // survives close/reopen; `applied` is what the trpc query actually keys off
  // so the table doesn't empty out behind the modal while the user is editing.
  const filters = useTableFilters(EMPTY_LOAD_FILTERS);

  const [newUninvData, setNewUninvData] = useState<LoadsType[]>([]);
  const [newData, setNewData] = useState<LoadsType[]>([]);
  const [newUninvCount, setNewUninvCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [page, setPage] = useState(0);
  const [tabValue, setTabValue] = React.useState(0);
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = React.useState('ID');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setPage(0);
    filters.clear();
    setShouldRefresh(true);
    setTabValue(newValue);
  };

  const applied = filters.applied;
  const loadsQueryInput = {
    page,
    customer: applied.customer,
    driver: applied.driver,
    truck: applied.truck,
    loadType: applied.loadType,
    deliveryLocation: applied.deliveryLocation,
    orderBy,
    order,
    search: applied.search,
    matchMode: applied.matchMode,
  };

  trpc.useQuery(
      ["loads.getAllPage", loadsQueryInput],
      {
        enabled: shouldRefresh,
        refetchOnWindowFocus: false,
        onSuccess(data) {
          setNewData(JSON.parse(JSON.stringify(data.rows)));
          setNewCount(data.count);
          setShouldRefresh(false);
        },
        onError(error) {
          console.warn(error.message);
          setShouldRefresh(false);
        },
      }
  );

  trpc.useQuery(
      ["loads.getUninvPage", loadsQueryInput],
      {
        enabled: shouldRefresh,
        refetchOnWindowFocus: false,
        onSuccess(data) {
          setNewUninvData(JSON.parse(JSON.stringify(data.rows)));
          setNewUninvCount(data.count);
          setShouldRefresh(false);
        },
        onError(error) {
          console.warn(error.message);
          setShouldRefresh(false);
        },
      }
  );

  const sortsApplied = order !== "desc" || orderBy !== "ID";
  // Use APPLIED state — not draft — so the table doesn't switch out from under
  // the user while they're filling in the modal.
  const useAllFetched =
    newData.length >= 1 || sortsApplied || filters.isActive;
  const useUninvFetched =
    newUninvData.length >= 1 || sortsApplied || filters.isActive;

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

  // Inputs in the filter modal are bound to `filters.draft` so values survive
  // closing/reopening the modal — only an explicit Apply promotes them to
  // `applied`, and only Clear wipes them.
  const draft = filters.draft;
  const filterBody = <div style={{display: "flex", flexDirection: "column"}}>
    <div style={{width: "100%", paddingBottom: 5}}>
      <BasicAutocomplete
          optionLabel={"Name+|+Street+,+City"}
          optionValue={"ID"}
          searchQuery={"customers"}
          label={"Customer"}
          defaultValue={draft.customer || null}
          onSelect={(c: any) => filters.updateDraft("customer", c)}
      />
    </div>
    <div style={{width: "100%", paddingBottom: 5}}>
      <TextField
          label={"Ticket Number"}
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
    <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingBottom: 5,
        }}
    >
      <div style={{width: "48%"}}>
        <BasicAutocomplete
            optionLabel={"FirstName+LastName"}
            optionValue={"ID"}
            searchQuery={"drivers"}
            label={"Driver"}
            defaultValue={draft.driver || null}
            onSelect={(d: any) => filters.updateDraft("driver", d)}
        />
      </div>
      <div style={{width: "48%"}}>
        <BasicAutocomplete
            optionLabel={"Name+|+Notes"}
            optionValue={"ID"}
            searchQuery={"trucks"}
            label={"Truck"}
            defaultValue={draft.truck || null}
            onSelect={(t: any) => filters.updateDraft("truck", t)}
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
      <div style={{width: "48%"}}>
        <BasicAutocomplete
            optionLabel={"Description"}
            optionValue={"ID"}
            searchQuery={"loadtypes"}
            label={"Load Type"}
            defaultValue={draft.loadType || null}
            onSelect={(lt: any) => filters.updateDraft("loadType", lt)}
        />
      </div>
      <div style={{width: "48%"}}>
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

  return (
      <Grid2 container wrap={'nowrap'}>
        <Grid2 xs={8} sx={{paddingRight: 2.5}}>
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
              <Tab label="All"/>
              <Tab label="Uninvoiced"/>
            </Tabs>

          </Box>
          {tabValue === 0 && (<GenericTable
              data={useAllFetched ? newData : loads}
              columns={columns}
              overrides={overrides}
              count={useAllFetched ? newCount : count}
              refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc' | 'desc') => {
                setPage(page);
                setOrderBy(orderBy);
                setOrder(order);
                setShouldRefresh(true);
              }}
              doSearch={handleApply}
              clearFilter={handleClear}
              filterBody={filterBody}
              searchSet={filters.isActive}
              matchMode={draft.matchMode}
              onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
          />)}

          {tabValue === 1 && (<GenericTable
              data={useUninvFetched ? newUninvData : uninvLoads}
              columns={uninvColumns}
              overrides={uninvOverrides}
              count={useUninvFetched ? newUninvCount : uninvCount}
              refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc' | 'desc') => {
                setPage(page);
                setOrderBy(orderBy);
                setOrder(order);
                setShouldRefresh(true);
              }}
              doSearch={handleApply}
              clearFilter={handleClear}
              filterBody={filterBody}
              searchSet={filters.isActive}
              matchMode={draft.matchMode}
              onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
          />)}

        </Grid2>
        <Divider
            flexItem={true}
            orientation={"vertical"}
            sx={{mr: "-1px"}}
            variant={"fullWidth"}
        />
        <Grid2 xs={4}>
          <Load
              refreshData={() => {
                setShouldRefresh(true);
              }}
          />
        </Grid2>
      </Grid2>
  );
};

export default Loads;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const loadInclude = {
    Customers: true,
    Trucks: true,
    Drivers: true,
    LoadTypes: true,
    DeliveryLocations: true,
  } as const;

  const [count, uninvCount, loads, uninvLoads] = await Promise.all([
    prisma.loads.count(),
    prisma.loads.count({
      where: {
        Invoiced: {
          not: true,
        },
      },
    }),
    prisma.loads.findMany({
      include: loadInclude,
      take: 10,
      orderBy: {
        ID: "desc",
      },
    }),
    prisma.loads.findMany({
      include: loadInclude,
      where: {
        Invoiced: {
          not: true,
        },
      },
      take: 10,
      orderBy: {
        StartDate: "asc",
      },
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
