import React, { FunctionComponent } from 'react';
import Grid2 from "@mui/material/Unstable_Grid2";
import Customer from "../../components/objects/customer";
import {GetServerSideProps} from "next";
import {PrismaClient} from "@prisma/client";
import { CustomersModel, StatesModel } from '../../../prisma/zod';
import {z} from "zod";

type StatesType = z.infer<typeof StatesModel>;


const Customers = ({states}: {states: StatesType[]}) => {

    return (
        <Grid2 container>
            <Grid2 xs={8}>
                Customers will be here soon...
            </Grid2>
            <Grid2 xs={4}>
                <Customer states={states}/>
            </Grid2>
        </Grid2>
    )
};

export default Customers;

export const getServerSideProps: GetServerSideProps = async (context) => {

    const prisma = new PrismaClient();

    const states = await prisma.states.findMany({});

    return {
        props: {
            states
        }
    }
}
