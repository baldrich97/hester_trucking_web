import React from 'react';
import CustomerObject from '../../components/objects/Customer';
import { GetServerSideProps } from 'next'
import { prisma } from 'server/db/client'
import { CustomersModel, StatesModel } from '../../../prisma/zod';
import {z} from "zod";

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;


const Customer = ({states, initialCustomer}: {states: StatesType[], initialCustomer: CustomersType}) => {

    return (
        <CustomerObject states={states} initialCustomer={initialCustomer}/>
    );
};



export default Customer;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialCustomer;

    

    if (id && typeof(id) === "string") {
        initialCustomer = await prisma.customers.findFirst({
            where: {
                ID: parseInt(id)
            }
        })
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
            initialCustomer
        }
    }
}