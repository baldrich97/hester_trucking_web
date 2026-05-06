import React, { useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import PartialLoad from "../../components/objects/PartialLoad";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import {LoadsModel} from "../../../prisma/zod";
import { z } from "zod";
import GenericTable from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";
import { trpc } from "../../utils/trpc";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import ArrowRight from "@mui/icons-material/ArrowRight";
import CloseIcon from "@mui/icons-material/Close";

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



const Loads = ({
                   loads,
                   count,
               }: {
    loads: LoadsType[];
    count: number;
}) => {
    const [search, setSearch] = useState<number|null>(null);

    const [searchSet, setSearchSet] = useState<boolean>(false);

    const [trpcData, setData] = useState<LoadsType[]>([]);

    const [newData, setNewData] = useState<LoadsType[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [newCount, setNewCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

    const [shouldRefresh, setShouldRefresh] = useState(false);

    const [page, setPage] = useState(0);

    const [customer, setCustomer] = useState(0);

    const [loadType, setLoadType] = useState(0);

    const [driver, setDriver] = useState(0);

    const [truck, setTruck] = useState(0);

    const [deliveryLocation, setDeliveryLocation] = useState(0);

    const [chosenLoad, setChosenLoad] = useState<LoadsType|null>(null)


    const handleLoad = (load: any) => {
        if (searchSet) {
            setNewData(newData.filter((record) => record.ID !== load.ID))
            if (newData.filter((record) => record.ID !== load.ID).length === 0) {
                setPage(0);
                setCustomer(0);
                setDriver(0);
                setTruck(0);
                setLoadType(0);
                setDeliveryLocation(0);
                setSearch(null);
                setShouldRefresh(true);
                setSearchSet(false);
                setChosenLoad(null)
            }
            return;
        }

        setCustomer(load.Customers.ID);
        setDriver(load.Drivers.ID);
        setTruck(load.Trucks.ID);
        setLoadType(load.LoadTypes.ID);
        setDeliveryLocation(load.DeliveryLocations.ID);
        setChosenLoad(load)
        setShouldRefresh(true)
        setSearch(null)
        setSearchSet(true)
    }

    const overrides: TableColumnOverridesType = [
        { name: "ID", type: "action", callback: handleLoad, icon: searchSet ? <CloseIcon style={{ color: "white" }} /> : <ArrowRight/> },
        { name: "Customers.Name", type: "link" },
        { name: "StartDate", type: "date" },
    ];

    const [order, setOrder] = React.useState<'asc'|'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState('ID')

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const {Customers, DeliveryLocations, Drivers, LoadTypes, Trucks, ...rest} = chosenLoad ?? {};



    /* trpc.useQuery(['loads.search', {search}], {
            enabled: shouldSearch,
            onSuccess(data) {
                setData(data);
                setCount(data.length)
                setShouldSearch(false);
            },
            onError(error) {
                console.warn(error.message)
                setShouldSearch(false)
            }
        })*/

    trpc.useQuery(
        [
            "loads.getAll",
            { page, customer, driver, truck, loadType, deliveryLocation, orderBy, order, search, chosenLoad: chosenLoad ? {...rest} : null },
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
        ["loads.getCount", { customer, driver, truck, loadType, deliveryLocation, search, chosenLoad: chosenLoad ? {MaterialRate: chosenLoad?.MaterialRate, DriverRate: chosenLoad?.DriverRate, TruckRate: chosenLoad?.TruckRate, TotalRate: chosenLoad?.TotalRate} : null }],
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
    const ticketFilterActive =
        search !== null &&
        search !== undefined &&
        Number.isFinite(search);
    const filtersActive =
        customer !== 0 ||
        driver !== 0 ||
        truck !== 0 ||
        loadType !== 0 ||
        deliveryLocation !== 0 ||
        ticketFilterActive ||
        searchSet;
    const useFetched =
        newData.length >= 1 || sortsApplied || filtersActive;

    return (
        <Grid2 container wrap={'nowrap'}>
            <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
                {/*<Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Loads'}/>
                </Grid2>*/}
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
                    doSearch={() => {
                        setPage(0);
                        setShouldRefresh(true);
                    }}
                    clearFilter={() => {
                        setPage(0);
                        setCustomer(0);
                        setDriver(0);
                        setTruck(0);
                        setLoadType(0);
                        setDeliveryLocation(0);
                        setSearch(null);
                        setShouldRefresh(true);
                        setSearchSet(false);
                        setChosenLoad(null)
                    }}
                    searchSet={searchSet}
                    filterBody={
                        <div style={{display: "flex", flexDirection: "column"}}>
                            <b style={{textAlign: "center"}}>Specify Search Terms</b>
                            <div style={{width: "100%", paddingBottom: 5}}>
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
                            <div style={{width: "100%", paddingBottom: 5}}>
                                <TextField
                                    label={"Ticket Number"}
                                    fullWidth
                                    type={"number"}
                                    size={"small"}
                                    onChange={(e) => {
                                        setSearch(parseFloat(e.currentTarget.value));
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
                                        defaultValue={null}
                                        onSelect={(driver: any) => {
                                            setDriver(driver);
                                        }}
                                    />
                                </div>
                                <div style={{width: "48%"}}>
                                    <BasicAutocomplete
                                        optionLabel={"Name+|+Notes"}
                                        optionValue={"ID"}
                                        searchQuery={"trucks"}
                                        label={"Truck"}
                                        defaultValue={null}
                                        onSelect={(truck: any) => {
                                            setTruck(truck);
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
                                <div style={{width: "48%"}}>
                                    <BasicAutocomplete
                                        optionLabel={"Description"}
                                        optionValue={"ID"}
                                        searchQuery={"loadtypes"}
                                        label={"Load Type"}
                                        defaultValue={null}
                                        onSelect={(loadType: any) => {
                                            setLoadType(loadType);
                                        }}
                                    />
                                </div>
                                <div style={{width: "48%"}}>
                                    <BasicAutocomplete
                                        optionLabel={"Description"}
                                        optionValue={"ID"}
                                        searchQuery={"deliverylocations"}
                                        label={"Delivery Location"}
                                        defaultValue={null}
                                        onSelect={(deliveryLocation: any) => {
                                            setDeliveryLocation(deliveryLocation);
                                        }}
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
                        setCustomer(0);
                        setDriver(0);
                        setTruck(0);
                        setLoadType(0);
                        setDeliveryLocation(0);
                        setSearch(null);
                        setShouldRefresh(true);
                        setSearchSet(false);
                        setChosenLoad(null)
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
