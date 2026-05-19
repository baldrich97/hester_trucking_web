import React, { useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import PartialLoad from "../../components/objects/PartialLoad";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import {LoadsModel} from "../../../prisma/zod";
import { z } from "zod";
import GenericTable from "../../elements/GenericTable";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";
import { trpc } from "../../utils/trpc";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import ArrowRight from "@mui/icons-material/ArrowRight";
import CloseIcon from "@mui/icons-material/Close";
import { TableFilterMatchMode } from "../../elements/GenericTable";
import { useTableFilters } from "../../utils/useTableFilters";

type LoadsType = z.infer<typeof LoadsModel>;

const columns: TableColumnsType = [
    { name: "Customers.Name", as: "Customer", navigateTo: "customers/[ID]", column: 'CustomerID' },
    { name: "StartDate", as: "Start Date" },
    { name: "TotalAmount", as: "Total Amount" },
    { name: "LoadTypes.Description", as: "Load Type", column: 'LoadTypeID'  },
    { name: "DeliveryLocations.Description", as: "Delivery Notes", column: 'DeliveryLocationID'  },
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
    // `draft` drives the modal inputs; `applied` drives the trpc query so the
    // table doesn't refresh out from under the user while they're editing the
    // modal. `setBoth` is the chosen-load path that auto-applies in one step.
    const filters = useTableFilters(EMPTY_LOAD_FILTERS);
    const draft = filters.draft;
    const applied = filters.applied;

    const [newData, setNewData] = useState<LoadsType[]>([]);
    const [newCount, setNewCount] = useState(0);
    const [shouldRefresh, setShouldRefresh] = useState(false);
    const [page, setPage] = useState(0);
    const [chosenLoad, setChosenLoad] = useState<LoadsType|null>(null);

    // searchSet is the legacy "we're in mass-edit-from-chosen-load mode" flag
    // (separate from a generic "filters are applied" check) because the table
    // and the right pane both branch on it.
    const [searchSet, setSearchSet] = useState<boolean>(false);

    const handleLoad = (load: any) => {
        if (searchSet) {
            const next = newData.filter((record) => record.ID !== load.ID);
            setNewData(next);
            if (next.length === 0) {
                setPage(0);
                filters.clear();
                setShouldRefresh(true);
                setSearchSet(false);
                setChosenLoad(null);
            }
            return;
        }

        filters.setBoth({
            customer: load.Customers.ID,
            driver: load.Drivers.ID,
            truck: load.Trucks.ID,
            loadType: load.LoadTypes.ID,
            deliveryLocation: load.DeliveryLocations.ID,
            search: null,
        });
        setChosenLoad(load);
        setShouldRefresh(true);
        setSearchSet(true);
    };

    const overrides: TableColumnOverridesType = [
        { name: "ID", type: "action", callback: handleLoad, icon: searchSet ? <CloseIcon style={{ color: "white" }} /> : <ArrowRight/> },
        { name: "Customers.Name", type: "link" },
        { name: "StartDate", type: "date" },
    ];

    const [order, setOrder] = React.useState<'asc'|'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState('ID');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const {Customers, DeliveryLocations, Drivers, LoadTypes, Trucks, ...rest} = chosenLoad ?? {};

    trpc.useQuery(
        [
            "loads.getAll",
            {
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
                chosenLoad: chosenLoad ? {...rest} : null,
            },
        ],
        {
            enabled: shouldRefresh,
            onSuccess(data) {
                setNewData(JSON.parse(JSON.stringify(data)));
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
            "loads.getCount",
            {
                customer: applied.customer,
                driver: applied.driver,
                truck: applied.truck,
                loadType: applied.loadType,
                deliveryLocation: applied.deliveryLocation,
                search: applied.search,
                matchMode: applied.matchMode,
                chosenLoad: chosenLoad
                    ? {MaterialRate: chosenLoad?.MaterialRate, DriverRate: chosenLoad?.DriverRate, TruckRate: chosenLoad?.TruckRate, TotalRate: chosenLoad?.TotalRate}
                    : null,
            },
        ],
        {
            enabled: shouldRefresh,
            onSuccess(data) {
                setNewCount(data);
                setShouldRefresh(false);
            },
            onError(error) {
                console.warn(error.message);
                setShouldRefresh(false);
            },
        }
    );

    const sortsApplied = order !== "desc" || orderBy !== "ID";
    const useFetched =
        newData.length >= 1 || sortsApplied || filters.isActive || searchSet;

    const handleApply = () => {
        filters.apply();
        setPage(0);
        setShouldRefresh(true);
    };

    const handleClear = () => {
        filters.clear();
        setSearchSet(false);
        setChosenLoad(null);
        setPage(0);
        setShouldRefresh(true);
    };

    return (
        <Grid2 container wrap={'nowrap'}>
            <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
                <GenericTable
                    key={`key-${shouldRefresh ? "1" : "2"}`}
                    data={useFetched ? newData : loads}
                    columns={columns}
                    overrides={overrides}
                    count={useFetched ? newCount : count}
                    refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc'|'desc') => {
                        setPage(page);
                        setOrderBy(orderBy);
                        setOrder(order);
                        setShouldRefresh(true);
                    }}
                    doSearch={handleApply}
                    clearFilter={handleClear}
                    searchSet={searchSet || filters.isActive}
                    matchMode={draft.matchMode}
                    onMatchModeChange={(m) => filters.updateDraft("matchMode", m)}
                    filterBody={
                        <div style={{display: "flex", flexDirection: "column"}}>
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
                    }
                />
            </Grid2>
            <Divider
                flexItem={true}
                orientation={"vertical"}
                sx={{mr: "-1px"}}
                variant={"fullWidth"}
            />
            <Grid2 xs={4}>
                <PartialLoad
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    key={chosenLoad ? chosenLoad?.ID.toString(): 'noload'}
                    initialLoad={chosenLoad}
                    refreshData={() => {
                        setPage(0);
                        filters.clear();
                        setShouldRefresh(true);
                        setSearchSet(false);
                        setChosenLoad(null);
                    }}
                    selectedLoads={(chosenLoad && newData) ? newData.map((record) => {return {ID: record.ID, TicketNumber: record.TicketNumber}}) : []}
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
