import React from 'react';
import LoadTypeObject from '../../components/objects/LoadType';
import { GetServerSideProps } from 'next'
import { prisma } from 'server/db/client'
import { LoadTypesModel } from '../../../prisma/zod';
import {z} from "zod";

type LoadTypesType = z.infer<typeof LoadTypesModel>;


const LoadType = ({initialLoadType}: {initialLoadType: LoadTypesType}) => {

    return (
        <LoadTypeObject initialLoadType={initialLoadType}/>
    );
};



export default LoadType;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialLoadType;

    

    if (id && typeof(id) === "string") {
        initialLoadType = await prisma.loadTypes.findFirst({
            where: {
                ID: parseInt(id)
            }
        })
    }

    if(!initialLoadType) {
        return {
            redirect: {
                permanent: false,
                destination: "/loadtypes"
            }
        }
    }

    return {
        props: {
            initialLoadType: JSON.parse(JSON.stringify(initialLoadType))
        }
    }
}