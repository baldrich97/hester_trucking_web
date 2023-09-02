import React, { useState } from 'react';
import CustomerObject from '../../components/objects/Customer';
import { GetServerSideProps } from 'next'
import { prisma } from 'server/db/client'
import { CustomersModel, InvoicesModel, StatesModel } from '../../../prisma/zod';
import {z} from "zod";
import Grid2 from "@mui/material/Unstable_Grid2";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import GenericTable from 'elements/GenericTable';
import { TableColumnOverridesType, TableColumnsType } from 'utils/types';
import { Invoices, Customers, Loads, DeliveryLocations, Drivers, LoadTypes, Trucks, CustomerDeliveryLocations, CustomerLoadTypes } from '@prisma/client';
import { trpc } from 'utils/trpc';

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type InvoicesType = z.infer<typeof InvoicesModel>;

const columns: TableColumnsType = [
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
    {name: 'Paid', type: 'checkbox'},
    {name: 'Printed', type: 'checkbox'},
    {name: 'PaidDate', type: 'date'},
    {name: 'InvoiceDate', type: 'date'}
]

const lcolumns: TableColumnsType = [
    {name: 'StartDate', as: 'Start Date'},
    {name: 'TotalAmount', as: 'Total Amount'},
    {name: 'LoadTypes.Description', as: 'Load Type'},
    {name: 'DeliveryLocations.Description', as: 'Delivery Notes'},
    {name: 'TicketNumber', as: 'Ticket #'},
    {name: 'Invoiced'},
    {name: 'ID', as: '', navigateTo: '/loads/'}
];

const loverrides: TableColumnOverridesType = [
    {name: 'ID', type: 'button'},
    {name: 'StartDate', type: 'date'},
    {name: 'Invoiced', type: 'checkbox'}
]


const Customer = ({states, initialCustomer, invoices, icount, lcount, loads}: {states: StatesType[], initialCustomer: CustomersType, invoices: InvoicesType[], icount: number, lcount: number, loads: LoadTypes[]}) => {

    const [tabValue, setTabValue] = React.useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const [trpcData, setData] = useState<InvoicesType[]>([]);

    const [ltrpcData, lsetData] = useState<LoadTypes[]>([]);

    const [shouldRefresh, setShouldRefresh] = useState(false);

    const [lshouldRefresh, lsetShouldRefresh] = useState(false);

    const [page, setPage] = useState(0);

    const [lpage, lsetPage] = useState(0);

    trpc.useQuery(['invoices.getAll', {page, customer: initialCustomer.ID}], {
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

    trpc.useQuery(['loads.getAll', {page: lpage, customer: initialCustomer.ID}], {
        enabled: lshouldRefresh,
        onSuccess(data) {
            lsetData(JSON.parse(JSON.stringify(data)));
            lsetShouldRefresh(false);
        },
        onError(error) {
            console.warn(error.message)
            lsetShouldRefresh(false)
        }
    })

    return (
        <Grid2 container>
            <Grid2 xs={12} sx={{paddingRight: 2.5}}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 2}}>
                    <Tabs value={tabValue} onChange={handleChange}>
                        <Tab label="Details"/>
                        <Tab label="Invoices"/>
                        <Tab label="Loads"/>
                    </Tabs>
                </Box>
                {tabValue === 0 && <CustomerObject states={states} initialCustomer={initialCustomer}/>}
                {tabValue === 1 && <GenericTable data={page === 0 ? invoices : trpcData} columns={columns} overrides={overrides} count={icount} selectedCustomer={initialCustomer.ID} refreshData={(page: React.SetStateAction<number>) => {
                    setPage(page)
                    setShouldRefresh(true)
                }} />}
                {tabValue === 2 && <GenericTable data={lpage === 0 ? loads : ltrpcData} columns={lcolumns} overrides={loverrides} count={lcount} selectedCustomer={initialCustomer.ID} refreshData={(page: React.SetStateAction<number>) => {
                    lsetPage(page)
                    lsetShouldRefresh(true)
                }} />}
            </Grid2>
        </Grid2>
    );
};



export default Customer;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialCustomer;

    let invoices: (Invoices & { Customers: Customers; Loads: Loads[]; })[] = [];

    let loads: (Loads & { Customers: Customers | null; DeliveryLocations: DeliveryLocations | null; Drivers: Drivers | null; LoadTypes: LoadTypes | null; Trucks: Trucks | null; })[] = [];

    let deliveryLocations: (CustomerDeliveryLocations & { Customers: Customers; DeliveryLocations: DeliveryLocations; })[] = [];

    let loadTypes: (CustomerLoadTypes & { Customers: Customers; LoadTypes: LoadTypes; })[] = [];

    let lcount = 0;

    let icount = 0;    

    let dcount = 0;

    let ltcount = 0;

    if (id && typeof(id) === "string") {
        initialCustomer = await prisma.customers.findFirst({
            where: {
                ID: parseInt(id)
            }
        })
        invoices = await prisma.invoices.findMany({
            include: {
                Customers: true,
                Loads: true
            },
            take: 10,
            orderBy: {
                ID: 'desc'
            },
            where: {AND: {CustomerID: parseInt(id)}}
        });

        loads = await prisma.loads.findMany({
            include: {
                Customers: true,
                Trucks: true,
                Drivers: true,
                LoadTypes: true,
                DeliveryLocations: true
            },
            orderBy: {
                ID: 'desc'
            },
            where: {
                OR: [
                    {
                        Deleted: false
                    },
                    {
                        Deleted: null
                    }
                ],
                AND: {CustomerID: parseInt(id)}
            },
            take: 10
        })

        deliveryLocations = await prisma.customerDeliveryLocations.findMany({
            include: {
                Customers: true,
                DeliveryLocations: true
            },
            orderBy: {
                ID: 'desc'
            },
            where: {
               CustomerID: parseInt(id)
            },
            take: 10
        })

        loadTypes = await prisma.customerLoadTypes.findMany({
            include: {
                Customers: true,
                LoadTypes: true
            },
            orderBy: {
                ID: 'desc'
            },
            where: {
               CustomerID: parseInt(id)
            },
            take: 10
        })


        icount = await prisma.invoices.count({where: {CustomerID: parseInt(id)}})

        lcount = await prisma.loads.count({where: {
            OR: [
                {
                    Deleted: false
                },
                {
                    Deleted: null
                }
            ],
            AND: {CustomerID: parseInt(id)}
        },})

        dcount = await prisma.customerDeliveryLocations.count({where: {CustomerID: parseInt(id)}});

        ltcount = await prisma.customerLoadTypes.count({where: {CustomerID: parseInt(id)}});
    }

    if(!initialCustomer) {
        return {
            redirect: {
                permanent: false,
                destination: "/customers"
            }
        }
    }

    const states = await prisma.states.findMany({});

    return {
        props: {
            states,
            initialCustomer,
            invoices: JSON.parse(JSON.stringify(invoices)),
            loads: JSON.parse(JSON.stringify(loads)),
            deliveryLocations: JSON.parse(JSON.stringify(deliveryLocations)),
            loadTypes: JSON.parse(JSON.stringify(loadTypes)),
            icount,
            lcount,
            dcount,
            ltcount
        }
    }
}