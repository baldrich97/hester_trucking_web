import React from "react";
import PayStubObject from "../../components/objects/PayStub";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import {parseRouteId} from "utils/parseRouteId";
import {DriversModel, PayStubsModel, JobsModel} from "../../../prisma/zod";
import {z} from "zod";
import type {PaystubJobRow} from "../../utils/paystubRevenue";

type DriversType = z.infer<typeof DriversModel>;
type PayStubsType = z.infer<typeof PayStubsModel>;
type JobsType = z.infer<typeof JobsModel>;
type PayStubJob = JobsType & Pick<PaystubJobRow, "Loads">;

interface PayStubData extends PayStubsType {
    Drivers: DriversType,
    Jobs: PayStubJob[],
}

const PayStub = ({
                     initialPaystub,
                 }: {
    initialPaystub: PayStubData;
}) => {
    return (
        <PayStubObject
            initialPayStub={initialPaystub}
        />
    );
};

export default PayStub;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = parseRouteId(context.params?.id);

    let initialPaystub;

    if (id) {
        initialPaystub = await prisma.payStubs.findFirst({
            where: {
                ID: id,
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

    return {
        props: {
            initialPaystub: JSON.parse(JSON.stringify(initialPaystub)),
        },
    };
};
