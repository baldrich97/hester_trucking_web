import React from 'react';
import DeliveryLocationObject from '../../components/objects/DeliveryLocation';
import { GetServerSideProps } from 'next'
import {PrismaClient} from "@prisma/client";
import { DeliveryLocationsModel } from '../../../prisma/zod';
import {z} from "zod";

type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;


const DeliveryLocation = ({initialDeliveryLocation}: {initialDeliveryLocation: DeliveryLocationsType}) => {

    return (
        <DeliveryLocationObject initialDeliveryLocation={initialDeliveryLocation}/>
    );
};



export default DeliveryLocation;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialDeliveryLocation;

    const prisma = new PrismaClient();

    if (id && typeof(id) === "string") {
        initialDeliveryLocation = await prisma.deliveryLocations.findFirst({
            where: {
                ID: parseInt(id)
            }
        })
    }

    if(!initialDeliveryLocation) {
        return {
            redirect: {
                permanent: false,
                destination: "/deliverylocations"
            }
        }
    }

    return {
        props: {
            initialDeliveryLocation: JSON.parse(JSON.stringify(initialDeliveryLocation))
        }
    }
}