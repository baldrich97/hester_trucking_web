import React from 'react';
import LoadObject from '../../components/objects/Load';
import { GetServerSideProps } from 'next'
import { prisma } from 'server/db/client'
import {LoadsModel} from '../../../prisma/zod';
import {z} from "zod";

type LoadsType = z.infer<typeof LoadsModel>;

const Load = ({initialLoad}: {initialLoad: LoadsType}) => {

    return (
        <LoadObject initialLoad={initialLoad} />
    );
};



export default Load;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialLoad;



    if (id && typeof(id) === "string") {
        initialLoad = await prisma.loads.findFirst({
            where: {
                ID: parseInt(id)
            },
            include: {
                Customers: true,
                Invoices: true,
                Drivers: true,
                LoadTypes: true,
                DeliveryLocations: true,
                Trucks: true
            }
        })
    }

    if(!initialLoad) {
        return {
            redirect: {
                permanent: false,
                destination: "/loads"
            }
        }
    }

    return {
        props: {
            initialLoad: JSON.parse(JSON.stringify(initialLoad)),
        },
    };
}