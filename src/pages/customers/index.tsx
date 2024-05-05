import React, {useEffect, useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import Customer from "../../components/objects/Customer";
import {GetServerSideProps} from "next";
import { prisma } from 'server/db/client'
import { CustomersModel, StatesModel } from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;

const columns: TableColumnsType = [
    {name: 'Name'},
    {name: 'Street'},
    {name: 'City'},
    {name: 'States.Abbreviation', as: 'State'},
    {name: 'ZIP'},
    {name: 'Phone'},
    {name: 'Notes'},
    {name: 'ID', as: '', navigateTo: '/customers/'}
];

const overrides: TableColumnOverridesType = [
    {name: 'ID', type: 'button'}
]

const Customers = ({states, customers, count}: {states: StatesType[], customers: CustomersType[], count: number}) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<CustomersType[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

    const [page, setPage] = useState(0);

    const [order, setOrder] = React.useState<'asc'|'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState('ID')

    useEffect(() => {
        if (search.length === 0) {
            setData([])
            setPage(0)
        }
    }, [search])

    trpc.useQuery(['customers.search', {search, page, orderBy, order}], {
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
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Customers'}/>
                </Grid2>
                <GenericTable data={trpcData.length > 0 || (order !== 'desc' || orderBy !== 'ID') ? trpcData : customers} columns={columns} overrides={overrides} count={search ? trpcCount : count} refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc'|'desc') => {
                    setPage(page);
                    setOrderBy(orderBy);
                    setOrder(order);
                    setShouldSearch(true);
                }}/>
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <Customer states={states}/>
            </Grid2>
        </Grid2>
    )
};

export default Customers;

export const getServerSideProps: GetServerSideProps = async (context) => {

    

    const count = await prisma.customers.count();

    const states = await prisma.states.findMany({});
    const customers = await prisma.customers.findMany({
        include: {
            States: true
        },
        orderBy: {
            Name: 'asc'
        },
        take: 10
    });

    return {
        props: {
            states,
            customers,
            count
        }
    }
}
