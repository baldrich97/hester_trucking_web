import React, {useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import Invoice from "../../components/objects/Invoice";
import {GetServerSideProps} from "next";
import {PrismaClient} from "@prisma/client";
import {CustomersModel, InvoicesModel, LoadsModel} from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;

const columns: TableColumnsType = [
    {name: 'Customers.Name', as: 'Customer', navigateTo: 'customers/[ID]'},
    {name: 'InvoiceDate', as: 'Invoice Date'},
    {name: 'TotalAmount', as: 'Total Amount'},
    {name: 'PaidDate', as: 'Date Paid'},
    {name: 'Paid'},
    {name: 'Printed'},
    {name: 'PaymentType', as: 'Payment Type'},
    {name: 'ID', as: '', navigateTo: '/invoices/'}
];

const overrides: TableColumnOverridesType = [
    {name: 'ID', type: 'button'},
    {name: 'Customers.Name', type: 'link'},
    {name: 'Paid', type: 'checkbox'},
    {name: 'Printed', type: 'checkbox'}
]

const Invoices = ({invoices, count, loads, customers}: {invoices: InvoicesType[], count: number, loads: LoadsType[], customers: CustomersType[]}) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<InvoicesType[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

   /* trpc.useQuery(['invoices.search', {search}], {
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
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Invoices'}/>
                </Grid2>*/}
                <GenericTable data={search ? trpcData : invoices} columns={columns} overrides={overrides} count={search ? trpcCount : count}/>
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <Invoice customers={customers} loads={loads}/>
            </Grid2>
        </Grid2>
    )
};

export default Invoices;

export const getServerSideProps: GetServerSideProps = async (context) => {

    const prisma = new PrismaClient();

    const count = await prisma.invoices.count();

    const invoices = await prisma.invoices.findMany({
        include: {
            Customers: true,
            Loads: true
        }
    });

    const customers = await prisma.customers.findMany({});

    const loads = await prisma.loads.findMany({});

    return {
        props: {
            invoices,
            count,
            customers,
            loads
        }
    }
}
