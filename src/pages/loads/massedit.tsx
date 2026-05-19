import React, { useMemo, useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import PartialLoad from "../../components/objects/PartialLoad";
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
import ArrowRight from "@mui/icons-material/ArrowRight";
import CloseIcon from "@mui/icons-material/Close";
import { useTableFilters } from "../../utils/useTableFilters";

type LoadsType = z.infer<typeof LoadsModel>;

type LoadWithRelations = LoadsType & {
  Customers: { ID: number } | null;
  Drivers: { ID: number } | null;
  Trucks: { ID: number } | null;
  LoadTypes: { ID: number } | null;
  DeliveryLocations: { ID: number } | null;
};

const columns: TableColumnsType = [
  { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: "CustomerID" },
  { name: "StartDate", as: "Start Date" },
  { name: "TotalAmount", as: "Total Amount" },
  { name: "LoadTypes.Description", as: "Load Type", column: "LoadTypeID" },
  { name: "DeliveryLocations.Description", as: "Delivery Notes", column: "DeliveryLocationID" },
  { name: "TicketNumber", as: "Ticket #" },
  { name: "ID", as: "", navigateTo: "/loads/" },
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
  count,
}: {
  loads: LoadsType[];
  count: number;
}) => {
  const filters = useTableFilters(EMPTY_LOAD_FILTERS);
  const draft = filters.draft;
  const applied = filters.applied;
  const tableRef = useRef<GenericTableHandle>(null);

  const [chosenLoad, setChosenLoad] = useState<LoadsType | null>(null);
  const [searchSet, setSearchSet] = useState(false);
  const [batchRows, setBatchRows] = useState<LoadsType[]>([]);
  const [rowOverride, setRowOverride] = useState<LoadsType[] | null>(null);

  const chosenLoadFilter = useMemo(() => {
    if (!chosenLoad) return null;
    const {
      Customers,
      DeliveryLocations,
      Drivers,
      LoadTypes,
      Trucks,
      ...rest
    } = chosenLoad as LoadsType & Record<string, unknown>;
    return rest;
  }, [chosenLoad]);

  const tableQueryInput = {
    customer: applied.customer,
    driver: applied.driver,
    truck: applied.truck,
    loadType: applied.loadType,
    deliveryLocation: applied.deliveryLocation,
    search: applied.search,
    matchMode: applied.matchMode,
    chosenLoad: chosenLoadFilter,
  };

  const displayedBatch = rowOverride ?? batchRows;

  const handleLoad = (load: LoadWithRelations) => {
    if (searchSet) {
      const source = rowOverride ?? batchRows;
      const next = source.filter((record) => record.ID !== load.ID);
      setRowOverride(next);
      if (next.length === 0) {
        setRowOverride(null);
        filters.clear();
        setSearchSet(false);
        setChosenLoad(null);
        setBatchRows([]);
        tableRef.current?.refresh();
      }
      return;
    }

    filters.setBoth({
      customer: load.Customers?.ID ?? 0,
      driver: load.Drivers?.ID ?? 0,
      truck: load.Trucks?.ID ?? 0,
      loadType: load.LoadTypes?.ID ?? 0,
      deliveryLocation: load.DeliveryLocations?.ID ?? 0,
      search: null,
    });
    setChosenLoad(load);
    setSearchSet(true);
    setRowOverride(null);
    setBatchRows([]);
  };

  const overrides: TableColumnOverridesType = [
    {
      name: "ID",
      type: "action",
      callback: handleLoad,
      icon: searchSet ? <CloseIcon style={{ color: "white" }} /> : <ArrowRight />,
    },
    { name: "Customers.Name", type: "link" },
    { name: "StartDate", type: "date" },
  ];

  const handleClear = () => {
    filters.clear();
    setSearchSet(false);
    setChosenLoad(null);
    setRowOverride(null);
    setBatchRows([]);
  };

  return (
    <Grid2 container wrap={"nowrap"}>
      <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
        <GenericTable
          tableRef={tableRef}
          trpcQuery="loads.getAllPage"
          trpcInput={tableQueryInput}
          resultShape="paginated"
          initialRows={loads}
          initialCount={count}
          defaultOrderBy="ID"
          defaultOrder="desc"
          remoteActive={searchSet || filters.isActive}
          filterRevision={filters.revision}
          rows={rowOverride !== null ? rowOverride : undefined}
          onRowsChange={(rows) => {
            if (searchSet && rowOverride === null) {
              setBatchRows(rows);
            }
          }}
          columns={columns}
          overrides={overrides}
          filterBody={
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
                <div style={{ width: "48%" }}>
                  <BasicAutocomplete
                    optionLabel={"FirstName+LastName"}
                    optionValue={"ID"}
                    searchQuery={"drivers"}
                    label={"Driver"}
                    defaultValue={draft.driver || null}
                    onSelect={(d: number) => filters.updateDraft("driver", d)}
                  />
                </div>
                <div style={{ width: "48%" }}>
                  <BasicAutocomplete
                    optionLabel={"Name+|+Notes"}
                    optionValue={"ID"}
                    searchQuery={"trucks"}
                    label={"Truck"}
                    defaultValue={draft.truck || null}
                    onSelect={(t: number) => filters.updateDraft("truck", t)}
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
                <div style={{ width: "48%" }}>
                  <BasicAutocomplete
                    optionLabel={"Description"}
                    optionValue={"ID"}
                    searchQuery={"loadtypes"}
                    label={"Load Type"}
                    defaultValue={draft.loadType || null}
                    onSelect={(lt: number) => filters.updateDraft("loadType", lt)}
                  />
                </div>
                <div style={{ width: "48%" }}>
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
          searchSet={searchSet || filters.isActive}
          matchMode={draft.matchMode}
          onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
          onApplyFilters={filters.apply}
          onClearFilters={handleClear}
        />
      </Grid2>
      <Divider
        flexItem={true}
        orientation={"vertical"}
        sx={{ mr: "-1px" }}
        variant={"fullWidth"}
      />
      <Grid2 xs={4}>
        <PartialLoad
          key={chosenLoad ? chosenLoad.ID.toString() : "noload"}
          initialLoad={chosenLoad}
          refreshData={() => {
            handleClear();
            tableRef.current?.refresh();
          }}
          selectedLoads={
            chosenLoad && displayedBatch.length > 0
              ? displayedBatch.map((record) => ({
                  ID: record.ID,
                  TicketNumber: record.TicketNumber,
                }))
              : []
          }
        />
      </Grid2>
    </Grid2>
  );
};

export default Loads;

export const getServerSideProps: GetServerSideProps = async () => {
  const count = await prisma.loads.count();

  const loads = await prisma.loads.findMany({
    include: {
      Customers: true,
      Trucks: true,
      Drivers: true,
      LoadTypes: true,
      DeliveryLocations: true,
    },
    take: 10,
    orderBy: {
      ID: "desc",
    },
  });

  return {
    props: {
      loads: JSON.parse(JSON.stringify(loads)),
      count,
    },
  };
};
