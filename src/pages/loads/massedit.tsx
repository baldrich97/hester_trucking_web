import React, { useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import PartialLoad from "../../components/objects/PartialLoad";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import {
    CustomersModel,
    DeliveryLocationsModel,
    DriversModel,
    LoadsModel,
    LoadTypesModel,
    TrucksModel,
} from "../../../prisma/zod";
import { z } from "zod";
import GenericTable from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";
import { trpc } from "../../utils/trpc";
import deliverylocations from "../deliverylocations";
import BasicAutocomplete from "elements/Autocomplete";
import TextField from "@mui/material/TextField";
import ArrowRight from "@mui/icons-material/ArrowRight";

type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type TrucksType = z.infer<typeof TrucksModel>;
type DriversType = z.infer<typeof DriversModel>;

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



const Loads = ({
                   loads,
                   count,
                   _customers,
                   _loadTypes,
                   _deliveryLocations,
                   _trucks,
                   _drivers,
               }: {
    loads: LoadsType[];
    _loadTypes: LoadTypesType[];
    _deliveryLocations: DeliveryLocationsType[];
    _trucks: TrucksType[];
    _drivers: DriversType[];
    count: number;
    _customers: CustomersType[];
}) => {
    const [search, setSearch] = useState<number|null>(null);

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

    const [chosenLoad, setChosenLoad] = useState(null)

    const [customers, setCustomers] = useState(_customers)
    const [loadTypes, setLTypes] = useState(_loadTypes)
    const [deliveryLocations, setDLocations] = useState(_deliveryLocations)
    const [trucks, setTrucks] = useState(_trucks)
    const [drivers, setDrivers] = useState(_drivers)

    const handleLoad = (load: any) => {
        if (_customers.filter((customer) => customer.ID === load.CustomerID).length === 0) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setCustomers([..._customers, load.Customers])
        }
        if (_drivers.filter((driver) => driver.ID === load.DriverID).length === 0) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setDrivers([..._drivers, load.Drivers])
        }
        if (_loadTypes.filter((loadtype) => loadtype.ID === load.LoadTypeID).length === 0) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setLTypes([..._loadTypes, load.LoadTypes])
        }
        if (_deliveryLocations.filter((deliverylocation) => deliverylocation.ID === load.DeliveryLocationID).length === 0) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setDLocations([..._deliveryLocations, load.DeliveryLocations])
        }
        if (_trucks.filter((truck) => truck.ID === load.TruckID).length === 0) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setTrucks([..._trucks, load.Trucks])
        }
        setChosenLoad(load)
    }

    const overrides: TableColumnOverridesType = [
        { name: "ID", type: "action", callback: handleLoad, icon: <ArrowRight/> },
        { name: "Customers.Name", type: "link" },
        { name: "StartDate", type: "date" },
        { name: "Invoiced", type: "checkbox" },
    ];

    const [order, setOrder] = React.useState<'asc'|'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState('ID')



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
            { page, customer, driver, truck, loadType, deliveryLocation, orderBy, order, search },
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
        ["loads.getCount", { customer, driver, truck, loadType, deliveryLocation, search }],
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

    return (
        <Grid2 container>
            <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
                {/*<Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Loads'}/>
                </Grid2>*/}
                <GenericTable
                    data={newData.length >= 1 || (order !== 'desc' || orderBy !== 'ID')  ? newData : loads}
                    columns={columns}
                    overrides={overrides}
                    count={newCount > 0 ? newCount : count}
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
                    }}
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
                    customers={customers}
                    loadTypes={loadTypes}
                    deliveryLocations={deliveryLocations}
                    trucks={trucks}
                    drivers={drivers}
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

    const customers = await prisma.customers.findMany({ take: 10 });

    const loadTypes = await prisma.loadTypes.findMany({
        orderBy: {
            Description: "asc",
        },
        take: 10,
    });

    const trucks = await prisma.trucks.findMany({
        orderBy: {
            Name: "asc",
        },
        take: 10,
    });

    const drivers = await prisma.drivers.findMany({
        orderBy: {
            LastName: "asc",
        },
        take: 10,
    });

    const deliveryLocations = await prisma.deliveryLocations.findMany({
        orderBy: {
            Description: "asc",
        },
        take: 10,
    });

    return {
        props: {
            loads: JSON.parse(JSON.stringify(loads)),
            count,
            _customers: JSON.parse(JSON.stringify(customers)),
            _trucks: JSON.parse(JSON.stringify(trucks)),
            _drivers: JSON.parse(JSON.stringify(drivers)),
            _deliveryLocations: JSON.parse(JSON.stringify(deliveryLocations)),
            _loadTypes: JSON.parse(JSON.stringify(loadTypes)),
        },
    };
};
