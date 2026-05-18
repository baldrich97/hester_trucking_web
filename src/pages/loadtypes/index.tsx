import React, {useEffect, useState} from 'react';
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

const LoadTypesIndex = ({loadtypes, count}: {loadtypes: LoadTypesType[], count: number}) => {

    const [search, setSearch] = useState('');

    const [page, setPage] = useState(0);

    const [order, setOrder] = React.useState<'asc'|'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState('ID')

    useEffect(() => {
        if (search.length === 0) {
            setPage(0);
        }
    }, [search])

    const {data: queryData, refetch} = trpc.useQuery(
        ['loadtypes.searchPage', {search, page, orderBy, order}],
        {refetchOnWindowFocus: false},
    );

    const tableData = queryData?.rows ?? loadtypes;
    const tableCount = queryData?.count ?? count;

    return (
        <Grid2 container wrap={'nowrap'}>
            <Grid2 xs={8} sx={{paddingRight: 2.5}}>
                <Grid2 xs={4}>
                    <SearchBar
                        setSearchQuery={setSearch}
                        setShouldSearch={() => {
                            setPage(0);
                        }}
                        query={search}
                        label={'Load Types'}
                    />
                </Grid2>
                <GenericTable
                    data={tableData}
                    columns={columns}
                    overrides={overrides}
                    count={tableCount}
                    page={page}
                    refreshData={(newPage: React.SetStateAction<number>, newOrderBy: string, newOrder: 'asc'|'desc') => {
                        setPage(newPage);
                        setOrderBy(newOrderBy);
                        setOrder(newOrder);
                    }}
                />
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <LoadType onCreated={() => {
                    setPage(0);
                    void refetch();
                }}/>
            </Grid2>
        </Grid2>
    )
};

export default LoadTypesIndex;

export const getServerSideProps: GetServerSideProps = async (context) => {

    

    const count = await prisma.loadTypes.count({
        where: {
            OR: [{Deleted: false}, {Deleted: null}],
        },
    });

    const loadtypes = await prisma.loadTypes.findMany({
        where: {
            OR: [{Deleted: false}, {Deleted: null}],
        },
        take: 10,
        orderBy: {
            ID: "desc"
        }
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
