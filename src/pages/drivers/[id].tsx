import React from 'react';
import DriverObject from '../../components/objects/Driver';
import { GetServerSideProps } from 'next'
import {PrismaClient} from "@prisma/client";
import { DriversModel, StatesModel } from '../../../prisma/zod';
import {z} from "zod";

type StatesType = z.infer<typeof StatesModel>;
type DriversType = z.infer<typeof DriversModel>;


const Driver = ({states, initialDriver}: {states: StatesType[], initialDriver: DriversType}) => {

    return (
        <DriverObject states={states} initialDriver={initialDriver}/>
    );
};



export default Driver;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialDriver;

    const prisma = new PrismaClient();

    if (id && typeof(id) === "string") {
        initialDriver = await prisma.drivers.findFirst({
            where: {
                ID: parseInt(id)
            }
        })
    }

    if(!initialDriver) {
        return {
            redirect: {
                permanent: false,
                destination: "/drivers"
            }
        }
    }

    const states = await prisma.states.findMany({});

    return {
        props: {
            states,
            initialDriver: JSON.parse(JSON.stringify(initialDriver))
        }
    }
}