import React from 'react';
import TruckObject from '../../components/objects/Truck';
import { GetServerSideProps } from 'next'
import { prisma } from 'server/db/client'
import { TrucksModel } from '../../../prisma/zod';
import {z} from "zod";

type TrucksType = z.infer<typeof TrucksModel>;


const Truck = ({initialTruck}: {initialTruck: TrucksType}) => {

    return (
        <TruckObject initialTruck={initialTruck}/>
    );
};



export default Truck;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialTruck;

    

    if (id && typeof(id) === "string") {
        initialTruck = await prisma.trucks.findFirst({
            where: {
                ID: parseInt(id)
            }
        })
    }

    if(!initialTruck) {
        return {
            redirect: {
                permanent: false,
                destination: "/trucks"
            }
        }
    }

    return {
        props: {
            initialTruck
        }
    }
}