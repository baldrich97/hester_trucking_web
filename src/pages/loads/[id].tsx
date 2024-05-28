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

const Load = ({initialLoad, customers, loadTypes, deliveryLocations, trucks, drivers}: {initialLoad: LoadsType, loads: LoadsType[], customers: CustomersType[], loadTypes: LoadTypesType[], deliveryLocations: DeliveryLocationsType[], trucks: TrucksType[], drivers: DriversType[]}) => {

    return (
        <LoadObject initialLoad={initialLoad} customers={customers} loadTypes={loadTypes} deliveryLocations={deliveryLocations} trucks={trucks} drivers={drivers}/>
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

    const customers = await prisma.customers.findMany({take: 10});

    //const customerLoadTypes = initialLoad.CustomerID ? await prisma.customerLoadTypes.findMany({where: {CustomerID: initialLoad.CustomerID}, select: {LoadTypeID: true}}).then((data) => data.map((item) => item.LoadTypeID)) : null;

   /* let foundLoadTypes: [] | LoadTypesType[] = [];*/

   /* if (customerLoadTypes) {
        foundLoadTypes = await prisma.loadTypes.findMany({where: {ID: {in: customerLoadTypes}}});
    }*/

    const loadTypes = await prisma.loadTypes.findMany({orderBy: {
        Description: "asc",
      },
    take: 10});

    const trucks = await prisma.trucks.findMany({orderBy: {
        Name: "asc",
      },
    take: 10});

    const drivers = await prisma.drivers.findMany({orderBy: {
        FirstName: "asc",
      },
    take: 10});

    const deliveryLocations = await prisma.deliveryLocations.findMany({orderBy: {
        Description: "asc",
      },
    take: 10});

    const {DriverID, LoadTypeID, DeliveryLocationID, TruckID, CustomerID} = initialLoad;

    if (customers.filter((cust) => cust.ID === CustomerID).length === 0) {
        const realCust = await prisma.customers.findUnique({where: {ID: CustomerID}});
        if (realCust) {
            customers.push(realCust);
        }
    }

    if (DriverID && drivers.filter((driver) => driver.ID === DriverID).length === 0) {
        const realDriver = await prisma.drivers.findUnique({where: {ID: DriverID}});
        if (realDriver) {
            drivers.push(realDriver);
        }
    }

    if (LoadTypeID && loadTypes.filter((type) => type.ID === LoadTypeID).length === 0) {
        const realType = await prisma.loadTypes.findUnique({where: {ID: LoadTypeID}});
        if (realType) {
            loadTypes.push(realType);
        }
    }

    if (DeliveryLocationID && deliveryLocations.filter((cust) => cust.ID === DeliveryLocationID).length === 0) {
        const realLocation = await prisma.deliveryLocations.findUnique({where: {ID: DeliveryLocationID}});
        if (realLocation) {
            deliveryLocations.push(realLocation);
        }
    }

    if (TruckID && trucks.filter((truck) => truck.ID === TruckID).length === 0) {
        const realTruck = await prisma.trucks.findUnique({where: {ID: TruckID}});
        if (realTruck) {
            trucks.push(realTruck);
        }
    }

    return {
        props: {
            initialLoad: JSON.parse(JSON.stringify(initialLoad)),
            customers,
            trucks,
            drivers: JSON.parse(JSON.stringify(drivers)),
            deliveryLocations,
            //loadTypes: [...foundLoadTypes, ...loadTypes]
            loadTypes: loadTypes
        }
    }
}