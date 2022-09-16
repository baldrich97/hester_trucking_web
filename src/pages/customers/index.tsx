import React, { FunctionComponent } from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import Customer from "../../components/objects/customer";
import {GetServerSideProps} from "next";
import {PrismaClient} from "@prisma/client";
import { CustomersModel, StatesModel } from '../../../prisma/zod';
import {z} from "zod";
import GenericTable from '../../elements/GenericTable';
import Divider from '@mui/material/Divider'
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;

//TODO abstract types out to a utils file or something

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

    return (
        <Grid2 container>
            <Grid2 xs={8} sx={{paddingRight: 2.5}}>
                <GenericTable data={customers} columns={columns} overrides={overrides} count={count}/>
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

    const prisma = new PrismaClient();

    const count = await prisma.customers.count();

    const states = await prisma.states.findMany({});
    const customers = await prisma.customers.findMany({
        include: {
            States: true
        }
    });

    return {
        props: {
            states,
            customers,
            count: count
        }
    }
}
