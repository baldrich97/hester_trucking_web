import React, {useEffect, useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import DeliveryLocation from "../../components/objects/DeliveryLocation";
import {GetServerSideProps} from "next";
import { prisma } from 'server/db/client'
import { DeliveryLocationsModel  } from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;

const columns: TableColumnsType = [
    {name: 'Description'},
    {name: 'ID', as: '', navigateTo: '/deliverylocations/'}
];

const overrides: TableColumnOverridesType = [
    {name: 'ID', type: 'button'}
]

const DeliveryLocations = ({deliverylocations, count}: {deliverylocations: DeliveryLocationsType[], count: number}) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<DeliveryLocationsType[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

    const [page, setPage] = useState(0);

    const [order, setOrder] = React.useState<'asc'|'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState('ID')

    useEffect(() => {
        if (search.length === 0) {
            setData([])
        }
    }, [search])

    trpc.useQuery(['deliverylocations.search', {search, page, orderBy, order}], {
        enabled: shouldSearch,
        onSuccess(data) {
            setData(data);
            setShouldSearch(false);
        },
        onError(error) {
            console.warn(error.message)
            setShouldSearch(false)
        }
    })

    return (
        <Grid2 container>
            <Grid2 xs={8} sx={{paddingRight: 2.5}}>
                <Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Delivery Locations'}/>
                </Grid2>
                <GenericTable data={trpcData.length || (order !== 'desc' || orderBy !== 'ID') ? trpcData : deliverylocations} columns={columns} overrides={overrides} count={search ? trpcCount : count} refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc'|'desc') => {
                    setPage(page);
                    setOrderBy(orderBy);
                    setOrder(order);
                    setShouldSearch(true);
                }}/>
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <DeliveryLocation/>
            </Grid2>
        </Grid2>
    )
};

export default DeliveryLocations;

export const getServerSideProps: GetServerSideProps = async (context) => {

    

    const count = await prisma.deliveryLocations.count();

    const deliverylocations = await prisma.deliveryLocations.findMany({
        take: 10,
        orderBy: {
            ID: 'desc'
        }
        /*include: {
            States: true MAYBE PUT CUSTOMERS HERE AT SOME POINT
        }*/
    });

    return {
        props: {
            deliverylocations: JSON.parse(JSON.stringify(deliverylocations)),
            count
        }
    }
}
