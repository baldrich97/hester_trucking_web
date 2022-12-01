import React, {useState} from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import Invoice from "../../components/objects/Invoice";
import {GetServerSideProps} from "next";
import { prisma } from 'server/db/client'
import {CustomersModel, InvoicesModel, LoadsModel} from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import SearchBar from '../../elements/SearchBar';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;

const columnsUnpaid: TableColumnsType = [
    {name: 'Customers.Name', as: 'Customer', navigateTo: 'customers/[ID]'},
    {name: 'InvoiceDate', as: 'Invoice Date'},
    {name: 'TotalAmount', as: 'Total Amount'},
    {name: 'Printed'},
    {name: 'ID', as: '', navigateTo: '/invoices/'}
];

const overridesUnpaid: TableColumnOverridesType = [
    {name: 'ID', type: 'button'},
    {name: 'Customers.Name', type: 'link'},
    {name: 'Printed', type: 'checkbox'},
    {name: 'InvoiceDate', type: 'date'}
]

const columnsPaid: TableColumnsType = [
    {name: 'Customers.Name', as: 'Customer', navigateTo: 'customers/[ID]'},
    {name: 'InvoiceDate', as: 'Invoice Date'},
    {name: 'TotalAmount', as: 'Total Amount'},
    {name: 'PaidDate', as: 'Date Paid'},
    {name: 'Paid'},
    {name: 'Printed'},
    {name: 'PaymentType', as: 'Payment Type'},
    {name: 'ID', as: '', navigateTo: '/invoices/'}
];

const overridesPaid: TableColumnOverridesType = [
    {name: 'ID', type: 'button'},
    {name: 'Customers.Name', type: 'link'},
    {name: 'Paid', type: 'checkbox'},
    {name: 'Printed', type: 'checkbox'},
    {name: 'PaidDate', type: 'date'},
    {name: 'InvoiceDate', type: 'date'}
]

const columnsAll: TableColumnsType = [
    {name: 'Customers.Name', as: 'Customer', navigateTo: 'customers/[ID]'},
    {name: 'InvoiceDate', as: 'Invoice Date'},
    {name: 'TotalAmount', as: 'Total Amount'},
    {name: 'PaidDate', as: 'Date Paid'},
    {name: 'Paid'},
    {name: 'Printed'},
    {name: 'PaymentType', as: 'Payment Type'},
    {name: 'ID', as: '', navigateTo: '/invoices/'}
];

const overridesAll: TableColumnOverridesType = [
    {name: 'ID', type: 'button'},
    {name: 'Customers.Name', type: 'link'},
    {name: 'Paid', type: 'checkbox'},
    {name: 'Printed', type: 'checkbox'},
    {name: 'PaidDate', type: 'date'},
    {name: 'InvoiceDate', type: 'date'}
]

const Invoices = ({invoicesUnpaid, invoicesPaid, invoicesAll, countUnpaid, countPaid, countAll, loads, customers}: {invoicesUnpaid: InvoicesType[], invoicesPaid: InvoicesType[], invoicesAll: InvoicesType[], countUnpaid: number, countPaid: number, countAll: number, loads: LoadsType[], customers: CustomersType[]}) => {

    const [search, setSearch] = useState('');

    const [trpcData, setData] = useState<InvoicesType[]>([]);

    const [trpcCount, setCount] = useState(0);

    const [shouldSearch, setShouldSearch] = useState(false);

    const [tabValue, setTabValue] = React.useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

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
                <Box sx={{ borderBottom: 1, borderColor: 'divider', paddingBottom: 1 }}>
                    <Tabs value={tabValue} onChange={handleChange}>
                        <Tab label="Unpaid" />
                        <Tab label="Paid" />
                        <Tab label="All" />
                    </Tabs>
                </Box>
                {/*<Grid2 xs={4}>
                    <SearchBar setSearchQuery={setSearch} setShouldSearch={setShouldSearch} query={search} label={'Invoices'}/>
                </Grid2>*/}
                {tabValue === 0 && <GenericTable data={search ? trpcData : invoicesUnpaid} columns={columnsUnpaid} overrides={overridesUnpaid} count={search ? trpcCount : countUnpaid}/>}

                {tabValue === 1 && <GenericTable data={search ? trpcData : invoicesPaid} columns={columnsPaid} overrides={overridesPaid} count={search ? trpcCount : countPaid}/>}

                {tabValue === 2 && <GenericTable data={search ? trpcData : invoicesAll} columns={columnsAll} overrides={overridesAll} count={search ? trpcCount : countAll}/>}
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <Invoice customers={customers}/>
            </Grid2>
        </Grid2>
    )
};

export default Invoices;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const countAll = await prisma.invoices.count();
    const countUnpaid = await prisma.invoices.count({where: {Paid: false}});
    const countPaid = await prisma.invoices.count({where: {Paid: true}});

    const invoicesAll = await prisma.invoices.findMany({
        include: {
            Customers: true,
            Loads: true
        }
    });

    const invoicesUnpaid = await prisma.invoices.findMany({
        where: {
            Paid: false
        },
        include: {
            Customers: true,
            Loads: true
        }
    });

    const invoicesPaid = await prisma.invoices.findMany({
        where: {
            Paid: true
        },
        include: {
            Customers: true,
            Loads: true
        }
    });

    const customers = await prisma.customers.findMany({});

    return {
        props: {
            invoicesAll: JSON.parse(JSON.stringify(invoicesAll)),
            invoicesUnpaid: JSON.parse(JSON.stringify(invoicesUnpaid)),
            invoicesPaid: JSON.parse(JSON.stringify(invoicesPaid)),
            countAll,
            countUnpaid,
            countPaid,
            customers
        }
    }
}
