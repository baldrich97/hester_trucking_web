import React, {useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import Driver from "../../components/objects/Driver";
import {GetServerSideProps} from "next";
import { prisma } from 'server/db/client'
import { DriversModel, StatesModel } from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type StatesType = z.infer<typeof StatesModel>;
type DriversType = z.infer<typeof DriversModel>;

const columns: TableColumnsType = [
    {name: 'FirstName', as: 'First Name'},
    {name: 'LastName', as: 'Last Name'},
    {name: 'Street'},
    {name: 'City'},
    {name: 'States.Abbreviation', as: 'State'},
    {name: 'ZIP'},
    {name: 'Phone'},
    {name: 'Notes'},
    {name: 'ID', as: '', navigateTo: '/drivers/'}
];

const overrides: TableColumnOverridesType = [
    {name: 'ID', type: 'button'}
]

const Drivers = ({states, drivers, count}: {states: StatesType[], drivers: DriversType[], count: number}) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<DriversType[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

    trpc.useQuery(['drivers.search', {search}], {
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
    })

    return (
        <Grid2 container>
            <Grid2 xs={8} sx={{paddingRight: 2.5}}>
                <Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Drivers'}/>
                </Grid2>
                <GenericTable data={search ? trpcData : drivers} columns={columns} overrides={overrides} count={search ? trpcCount : count}/>
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <Driver states={states}/>
            </Grid2>
        </Grid2>
    )
};

export default Drivers;

export const getServerSideProps: GetServerSideProps = async (context) => {

    

    const count = await prisma.drivers.count();

    const states = await prisma.states.findMany({});
    const drivers = await prisma.drivers.findMany({
        include: {
            States: true
        }
    });

    return {
        props: {
            states,
            drivers: JSON.parse(JSON.stringify(drivers)),
            count
        }
    }
}
