import React, {useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import Load from "../../components/objects/Load";
import {GetServerSideProps} from "next";
import { prisma } from 'server/db/client'
import {
    CustomersModel,
    DeliveryLocationsModel,
    DriversModel,
    LoadsModel,
    LoadTypesModel,
    TrucksModel
} from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";
import deliverylocations from "../deliverylocations";

type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type TrucksType = z.infer<typeof TrucksModel>;
type DriversType = z.infer<typeof DriversModel>;

const columns: TableColumnsType = [
    {name: 'Customers.Name', as: 'Customer', navigateTo: 'customers/[ID]'},
    {name: 'StartDate', as: 'Start Date'},
    {name: 'TotalAmount', as: 'Total Amount'},
    {name: 'ID', as: '', navigateTo: '/loads/'}
];

const overrides: TableColumnOverridesType = [
    {name: 'ID', type: 'button'},
    {name: 'Customers.Name', type: 'link'},
]

const Loads = ({loads, count, customers, loadTypes, deliveryLocations, trucks, drivers}: {loads: LoadsType[], loadTypes: LoadTypesType[], deliveryLocations: DeliveryLocationsType[], trucks: TrucksType[], drivers: DriversType[], count: number, customers: CustomersType[]}) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<LoadsType[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

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

    return (
        <Grid2 container>
            <Grid2 xs={8} sx={{paddingRight: 2.5}}>
                {/*<Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Loads'}/>
                </Grid2>*/}
                <GenericTable data={search ? trpcData : loads} columns={columns} overrides={overrides} count={search ? trpcCount : count}/>
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <Load customers={customers} loadTypes={loadTypes} deliveryLocations={deliveryLocations} trucks={trucks} drivers={drivers}/>
            </Grid2>
        </Grid2>
    )
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
            DeliveryLocations: true
        }
    });

    const customers = await prisma.customers.findMany({});

    const loadTypes = await prisma.loadTypes.findMany({});

    const trucks = await prisma.trucks.findMany({});

    const drivers = await prisma.drivers.findMany({});

    const deliveryLocations = await prisma.deliveryLocations.findMany({});

    return {
        props: {
            loads: JSON.parse(JSON.stringify(loads)),
            count,
            customers,
            trucks,
            drivers: JSON.parse(JSON.stringify(drivers)),
            deliveryLocations,
            loadTypes
        }
    }
}
