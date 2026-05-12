import React from 'react';
import DriverObject from '../../components/objects/Driver';
import { GetServerSideProps } from 'next'
import { prisma } from 'server/db/client'
import { DriversModel, StatesModel } from '../../../prisma/zod';
import {z} from "zod";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableEntityLink from "../../elements/TableEntityLink";

type StatesType = z.infer<typeof StatesModel>;
type DriversType = z.infer<typeof DriversModel>;

type TruckDrivenRow = {
    ID: number;
    DateDriven: string;
    TruckID: number;
    Trucks: { ID: number; Name: string; VIN: string | null; LicensePlate: string | null } | null;
};


const Driver = ({states, initialDriver, trucksDriven}: {states: StatesType[], initialDriver: DriversType, trucksDriven: TruckDrivenRow[]}) => {

    return (
        <>
            <DriverObject states={states} initialDriver={initialDriver}/>
            <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Trucks driven</Typography>
            <Table size="small" sx={{ maxWidth: 900 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Truck</TableCell>
                        <TableCell>VIN</TableCell>
                        <TableCell>Plate</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {trucksDriven.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4}>No trucks on file for this driver.</TableCell>
                        </TableRow>
                    ) : (
                        trucksDriven.map((row) => (
                            <TableRow key={row.ID}>
                                <TableCell>{new Date(row.DateDriven).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    {row.Trucks ? (
                                        <TableEntityLink href={`/trucks/${row.Trucks.ID}`}>
                                            {row.Trucks.Name}
                                        </TableEntityLink>
                                    ) : (
                                        "—"
                                    )}
                                </TableCell>
                                <TableCell>{row.Trucks?.VIN ?? "—"}</TableCell>
                                <TableCell>{row.Trucks?.LicensePlate ?? "—"}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </>
    );
};



export default Driver;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialDriver;

    

    let trucksDriven: TruckDrivenRow[] = [];

    if (id && typeof(id) === "string") {
        const row = await prisma.drivers.findFirst({
            where: {
                ID: parseInt(id)
            },
            include: {
                TrucksDriven: {
                    include: { Trucks: true },
                    orderBy: { DateDriven: "desc" },
                },
            },
        });
        if (row) {
            const {TrucksDriven, ...rest} = row;
            initialDriver = rest;
            trucksDriven = JSON.parse(JSON.stringify(TrucksDriven)) as TruckDrivenRow[];
        }
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
            initialDriver: JSON.parse(JSON.stringify(initialDriver)),
            trucksDriven,
        }
    }
}