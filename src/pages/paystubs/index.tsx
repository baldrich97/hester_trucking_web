import React, {useEffect, useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import PayStub from "../../components/objects/PayStub";
import {GetServerSideProps} from "next";
import {prisma} from 'server/db/client'
import {PayStubsModel, JobsModel, DriversModel, LoadTypesModel, CompleteJobs} from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DriversType = z.infer<typeof DriversModel>;
type PayStubsType = z.infer<typeof PayStubsModel>;
type JobsType = z.infer<typeof JobsModel>;
interface PayStubData extends PayStubsType {
    Drivers: DriversType,
    Jobs: JobsType[],
}

const columns: TableColumnsType = [
    {name: 'Created'},
    {name: 'DepositDate', as: 'Deposit Date'},
    {name: 'Drivers.FirstName+Drivers.LastName', as: 'Driver', column: 'DriverID'},
    {name: 'Gross', as: 'Gross Pay'},
    {name: 'NetTotal', as: 'Net Pay'},
    {name: 'TakeHome', as: 'Take Home Pay'},
    {name: 'CheckNumber', as: 'Check #'},
    {name: 'ID', as: '', navigateTo: '/paystubs/'}
];

const overrides: TableColumnOverridesType = [
    {name: 'Created', type: 'date'},
    {name: 'DepositDate', type: 'date'},
    {name: 'ID', type: 'button'}
]

const PayStubs = ({count, drivers, payStubs}: { count: number, drivers: DriversType[], payStubs: PayStubData[] }) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<PayStubData[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

    const [page, setPage] = useState(0);

    const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState('ID')

    useEffect(() => {
        if (search.length === 0) {
            setData([])
        }
    }, [search])

    trpc.useQuery(['paystubs.search', {search, page, orderBy, order}], {
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
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search}
                               label={'Pay Stubs'}/>
                </Grid2>
                <GenericTable data={trpcData.length || (order !== 'desc' || orderBy !== 'ID') ? trpcData : payStubs}
                              columns={columns}
                              overrides={overrides}
                              count={search ? trpcCount : count}
                              refreshData={(page: React.SetStateAction<number>, orderBy: string, order: 'asc' | 'desc') => {
                                  setPage(page);
                                  setOrderBy(orderBy);
                                  setOrder(order);
                                  setShouldSearch(true);
                              }}/>
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{mr: "-1px"}} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <PayStub drivers={drivers}/>
            </Grid2>
        </Grid2>
    )
};

export default PayStubs;

export const getServerSideProps: GetServerSideProps = async (context) => {


    //TODO DO PAYSTUBS CALL HERE

    const count = await prisma.payStubs.count();

    const payStubs = await prisma.payStubs.findMany({
        take: 10,
        orderBy: {
            ID: "desc"
        },
        include: {
            Drivers: true,
        }
    });

    const drivers = await prisma.drivers.findMany({
        orderBy: {
            LastName: "asc",
        },
        take: 10,
    });


    return {
        props: {
            payStubs: JSON.parse(JSON.stringify(payStubs)),
            count,
            drivers: JSON.parse(JSON.stringify(drivers)),
        }
    }
}
