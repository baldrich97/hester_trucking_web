import React from "react";
import PayStubObject from "../../components/objects/PayStub";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import {
    InvoicesModel,
    CustomersModel,
    LoadsModel,
    WeekliesModel,
    LoadTypesModel,
    DriversModel, PayStubsModel, JobsModel
} from "../../../prisma/zod";
import {z} from "zod";
import {Jobs} from "@prisma/client";

type DriversType = z.infer<typeof DriversModel>;
type PayStubsType = z.infer<typeof PayStubsModel>;
type JobsType = z.infer<typeof JobsModel>;

interface PayStubData extends PayStubsType {
    Drivers: DriversType,
    Jobs: JobsType[],
}

const PayStub = ({
                     initialPaystub,
                     drivers,
                     jobs
                 }: {
    initialPaystub: PayStubData;
    drivers: DriversType[];
    jobs: JobsType[];
}) => {
    return (
        <PayStubObject
            initialPayStub={initialPaystub}
            drivers={drivers}
        />
    );
};

export default PayStub;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialPaystub;

    if (id && typeof id === "string") {
        initialPaystub = await prisma.payStubs.findFirst({
            where: {
                ID: parseInt(id),
            },
            include: {
                Drivers: true,
                Jobs: {
                    include: {
                        LoadTypes: {
                            select: {
                                Description: true
                            }
                        },
                        DeliveryLocations: {
                            select: {
                                Description: true
                            }
                        },
                        Customers: {
                            select: {
                                Name: true
                            }
                        },
                        Loads: {
                            include: {
                                Trucks: true
                            },
                            orderBy: {
                                StartDate: 'asc'
                            }
                        }
                    }
                },
            },
        });
    }

    if (!initialPaystub) {
        return {
            redirect: {
                permanent: false,
                destination: "/paystubs",
            },
        };
    }

    const drivers = await prisma.drivers.findMany({});

    return {
        props: {
            initialPaystub: JSON.parse(JSON.stringify(initialPaystub)),
            drivers: JSON.parse(JSON.stringify(drivers)),
        },
    };
};
