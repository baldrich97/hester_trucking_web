import React, {useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import LoadType from "../../components/objects/LoadType";
import {GetServerSideProps} from "next";
import { prisma } from 'server/db/client'
import { LoadTypesModel  } from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type LoadTypesType = z.infer<typeof LoadTypesModel>;

const columns: TableColumnsType = [
    {name: 'Description'},
    {name: 'Notes'},
    {name: 'ID', as: '', navigateTo: '/loadtypes/'}
];

const overrides: TableColumnOverridesType = [
    {name: 'ID', type: 'button'}
]

const DeliveryLocations = ({loadtypes, count}: {loadtypes: LoadTypesType[], count: number}) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<LoadTypesType[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

    trpc.useQuery(['loadtypes.search', {search}], {
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
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Load Types'}/>
                </Grid2>
                <GenericTable data={search ? trpcData : loadtypes} columns={columns} overrides={overrides} count={search ? trpcCount : count}/>
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <LoadType/>
            </Grid2>
        </Grid2>
    )
};

export default DeliveryLocations;

export const getServerSideProps: GetServerSideProps = async (context) => {

    

    const count = await prisma.loadTypes.count();

    const loadtypes = await prisma.loadTypes.findMany({
        /*include: {
            States: true MAYBE PUT CUSTOMERS HERE AT SOME POINT
        }*/
    });

    return {
        props: {
            loadtypes: JSON.parse(JSON.stringify(loadtypes)),
            count
        }
    }
}
