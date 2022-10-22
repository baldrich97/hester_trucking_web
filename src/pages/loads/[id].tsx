import React from 'react';
import LoadObject from '../../components/objects/Load';
import { GetServerSideProps } from 'next'
import { prisma } from 'server/db/client'
import {
    CustomersModel,
    DeliveryLocationsModel,
    DriversModel,
    LoadsModel,
    LoadTypesModel,
    TrucksModel
} from '../../../prisma/zod';
import {z} from "zod";

type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type TrucksType = z.infer<typeof TrucksModel>;
type DriversType = z.infer<typeof DriversModel>;

const Invoice = ({initialLoad, customers, loadTypes, deliveryLocations, trucks, drivers}: {initialLoad: LoadsType, loads: LoadsType[], customers: CustomersType[], loadTypes: LoadTypesType[], deliveryLocations: DeliveryLocationsType[], trucks: TrucksType[], drivers: DriversType[]}) => {

    return (
        <LoadObject initialLoad={initialLoad} customers={customers} loadTypes={loadTypes} deliveryLocations={deliveryLocations} trucks={trucks} drivers={drivers}/>
    );
};



export default Invoice;

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

    const customers = await prisma.customers.findMany({});

    const loads = await prisma.loads.findMany({});

    //const customerLoadTypes = initialLoad.CustomerID ? await prisma.customerLoadTypes.findMany({where: {CustomerID: initialLoad.CustomerID}, select: {LoadTypeID: true}}).then((data) => data.map((item) => item.LoadTypeID)) : null;

    let foundLoadTypes: [] | LoadTypesType[] = [];

    if (customerLoadTypes) {
        foundLoadTypes = await prisma.loadTypes.findMany({where: {ID: {in: customerLoadTypes}}});
    }

    const loadTypes = await prisma.loadTypes.findMany({});

    const trucks = await prisma.trucks.findMany({});

    const drivers = await prisma.drivers.findMany({});

    const deliveryLocations = await prisma.deliveryLocations.findMany({});

    return {
        props: {
            loads: JSON.parse(JSON.stringify(loads)),
            initialLoad: JSON.parse(JSON.stringify(initialLoad)),
            customers,
            trucks,
            drivers: JSON.parse(JSON.stringify(drivers)),
            deliveryLocations,
            loadTypes: [...foundLoadTypes, ...loadTypes]
        }
    }
}