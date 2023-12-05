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
import {trpc} from "../../utils/trpc";

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

const Invoices = ({invoicesUnpaid, invoicesPaid, invoicesAll, customers, lastInvoice}: {invoicesUnpaid: InvoicesType[], invoicesPaid: InvoicesType[], invoicesAll: InvoicesType[], customers: CustomersType[], lastInvoice: number}) => {

    const [unpaidData, setUnpaidData] = useState<InvoicesType[]>([]);
    const [paidData, setPaidData] = useState<InvoicesType[]>([]);
    const [trpcData, setData] = useState<InvoicesType[]>([]);

    const [shouldRefresh, setShouldRefresh] = useState(false);

    const [customer, setCustomer] = useState(0);

    const [tabValue, setTabValue] = React.useState(0);

    //const [cursor, setCursor] = useState(loads[loads.length - 1]?.ID ?? 1);

    //TODO FIGURE OUT HOW TO FIND A SPECIFIC INVOICE THAT ISN'T SEARCHING

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    //TODO could probably consolidate calls and filter/parse on frontend if needed

    trpc.useQuery(['invoices.getAllUnpaid', {customer}], {
        enabled: shouldRefresh,
        onSuccess(data) {
            setUnpaidData(JSON.parse(JSON.stringify(data)));
            setShouldRefresh(false);
        },
        onError(error) {
            console.warn(error.message)
            setShouldRefresh(false)
        }
    })

    trpc.useQuery(['invoices.getAllPaid', {customer}], {
        enabled: shouldRefresh,
        onSuccess(data) {
            setPaidData(JSON.parse(JSON.stringify(data)));
            setShouldRefresh(false);
        },
        onError(error) {
            console.warn(error.message)
            setShouldRefresh(false)
        }
    })

    trpc.useQuery(['invoices.getAll', {customer}], {
        enabled: shouldRefresh,
        onSuccess(data) {
            setData(JSON.parse(JSON.stringify(data)));
            setShouldRefresh(false);
        },
        onError(error) {
            console.warn(error.message)
            setShouldRefresh(false)
        }
    })

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
                {tabValue === 0 && <GenericTable data={customer ? unpaidData : invoicesUnpaid} columns={columnsUnpaid} overrides={overridesUnpaid} count={10} setCustomer={(customer: React.SetStateAction<number>) => {
                    setCustomer(customer);
                    setShouldRefresh(true)
                }}
                selectedCustomer={customer}/>}

                {tabValue === 1 && <GenericTable data={customer ? paidData : invoicesPaid} columns={columnsPaid} overrides={overridesPaid} count={10} setCustomer={(customer: React.SetStateAction<number>) => {
                    setCustomer(customer);
                    setShouldRefresh(true)
                }}
                selectedCustomer={customer}/>}

                {tabValue === 2 && <GenericTable data={customer ? trpcData : invoicesAll} columns={columnsAll} overrides={overridesAll} count={10} setCustomer={(customer: React.SetStateAction<number>) => {
                    setCustomer(customer);
                    setShouldRefresh(true)
                }}
                selectedCustomer={customer}/>}
            </Grid2>
            <Divider flexItem={true} orientation={'vertical'} sx={{ mr: "-1px" }} variant={'fullWidth'}/>
            <Grid2 xs={4}>
                <Invoice customers={customers}
                         refreshData={() => {
                             setShouldRefresh(true);
                         }}
                         lastInvoice={lastInvoice}
                />
            </Grid2>
        </Grid2>
    )
};

export default Invoices;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const countAll = await prisma.invoices.count();
    const countUnpaid = await prisma.invoices.count({where: {Paid: false}});
    const countPaid = await prisma.invoices.count({where: {Paid: true}});

    const lastInvoice = await prisma.invoices.aggregate({
        _max: {
            Number: true
        }
    });

    const invoicesAll = await prisma.invoices.findMany({
        include: {
            Customers: true,
            Loads: true
        },
        take: 10,
        orderBy: {
            ID: 'desc'
        }
    });

    const invoicesUnpaid = await prisma.invoices.findMany({
        where: {
            Paid: false
        },
        include: {
            Customers: true,
            Loads: true
        },
        take: 10,
        orderBy: {
            InvoiceDate: 'desc'
        }
    });

    const invoicesPaid = await prisma.invoices.findMany({
        where: {
            Paid: true
        },
        include: {
            Customers: true,
            Loads: true
        },
        take: 10,
        orderBy: {
            PaidDate: 'desc'
        }
    });

    const customers = await prisma.customers.findMany({take: 10});

    return {
        props: {
            invoicesAll: JSON.parse(JSON.stringify(invoicesAll)),
            invoicesUnpaid: JSON.parse(JSON.stringify(invoicesUnpaid)),
            invoicesPaid: JSON.parse(JSON.stringify(invoicesPaid)),
            countAll,
            countUnpaid,
            countPaid,
            customers,
            lastInvoice: (lastInvoice?._max.Number ?? 0) + 1
        }
    }
}
