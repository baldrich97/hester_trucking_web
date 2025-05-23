import React, {FunctionComponent, useEffect, useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import Truck from "../../components/objects/Truck";
import {GetServerSideProps} from "next";
import { prisma } from 'server/db/client'
import { TrucksModel } from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type TrucksType = z.infer<typeof TrucksModel>;

const columns: TableColumnsType = [
    {name: 'Name'},
    {name: 'VIN'},
    {name: 'Notes'},
    {name: 'ID', as: '', navigateTo: '/trucks/'}
];

const overrides: TableColumnOverridesType = [
    {name: 'ID', type: 'button'}
]

const Trucks = ({trucks, count}: {trucks: TrucksType[], count: number}) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<TrucksType[]>([]);

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

    trpc.useQuery(['trucks.search', {search, page, orderBy, order}], {
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
        <Grid2 container wrap={'nowrap'}>
            <Grid2 xs={8} sx={{paddingRight: 2.5}}>
                <Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Trucks'}/>
                </Grid2>
                <GenericTable data={trpcData.length || (order !== 'desc' || orderBy !== 'ID') ? trpcData : trucks} columns={columns} overrides={overrides} count={search ? trpcCount : count} refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc'|'desc') => {
                    setPage(page);
                    setOrderBy(orderBy);
                    setOrder(order);
                    setShouldSearch(true);
                }}/>
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <Truck/>
            </Grid2>
        </Grid2>
    )
};

export default Trucks;

export const getServerSideProps: GetServerSideProps = async (context) => {

    

    const count = await prisma.trucks.count();

    const trucks = await prisma.trucks.findMany({take: 10, orderBy: {ID: "desc"}});

    return {
        props: {
            trucks,
            count
        }
    }
}
