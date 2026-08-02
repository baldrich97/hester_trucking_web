import React, {useEffect} from 'react';
import DriverObject from '../../components/objects/Driver';
import DriverProfileForms, {
    computeDriverFormsIssueCount,
} from '../../components/collections/DriverProfileForms';
import type {DriverFormsDataType} from '../../components/collections/DriverForms';
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router';
import { prisma } from 'server/db/client'
import {CompleteFormOptions, StatesModel} from '../../../prisma/zod';
import {z} from "zod";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Badge from "@mui/material/Badge";
import TableEntityLink from "../../elements/TableEntityLink";

type StatesType = z.infer<typeof StatesModel>;

type TruckDrivenRow = {
    TruckID: number;
    lastDriven: string;
    driveCount: number;
    Trucks: { ID: number; Name: string; VIN: string | null; LicensePlate: string | null } | null;
};

const entityDriverInclude = {
    DriverForms: true,
    States: true,
    Carriers: {include: {States: true}},
    TrucksDriven: {
        distinct: ["TruckID" as const],
        select: {
            TruckID: true,
            Trucks: true,
        },
    },
};

const Driver = ({
    states,
    initialDriver,
    trucksDriven,
    entityDrivers,
    allForms,
    mode,
    initialTab,
}: {
    states: StatesType[];
    initialDriver: DriverFormsDataType;
    trucksDriven: TruckDrivenRow[];
    entityDrivers: DriverFormsDataType[];
    allForms: CompleteFormOptions[];
    mode: "w2" | "oo";
    initialTab: number;
}) => {
    const router = useRouter();
    const [tabValue, setTabValue] = React.useState(initialTab);

    useEffect(() => {
        setTabValue(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (!router.isReady) return;
        const tab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
        if (tab === "forms") {
            setTabValue(1);
        } else if (tab !== undefined) {
            setTabValue(0);
        }
    }, [router.isReady, router.query.tab]);

    const issueCount = computeDriverFormsIssueCount(
        initialDriver,
        entityDrivers,
        allForms,
        mode,
    );

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        const basePath = `/drivers/${initialDriver.ID}`;
        if (newValue === 1) {
            void router.replace(`${basePath}?tab=forms`, undefined, {shallow: true});
        } else {
            void router.replace(basePath, undefined, {shallow: true});
        }
    };

    return (
        <>
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2, px: 2.5 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="Details" />
                    <Tab
                        label={
                            issueCount > 0 ? (
                                <Badge badgeContent={issueCount} color="error" sx={{pr: 2}}>
                                    Forms
                                </Badge>
                            ) : (
                                "Forms"
                            )
                        }
                    />
                </Tabs>
            </Box>

            {tabValue === 0 ? (
                <>
                    <DriverObject states={states} initialDriver={initialDriver}/>
                    <Typography variant="h6" sx={{ mt: 4, mb: 1, px: 2.5 }}>Trucks driven</Typography>
                    <Box sx={{px: 2.5, width: "100%"}}>
                        <Table size="small" sx={{width: "100%"}}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Last driven</TableCell>
                                <TableCell>Truck</TableCell>
                                <TableCell>VIN</TableCell>
                                <TableCell>Plate</TableCell>
                                <TableCell align="right">Times driven</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {trucksDriven.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5}>No trucks on file for this driver.</TableCell>
                                </TableRow>
                            ) : (
                                trucksDriven.map((row) => (
                                    <TableRow key={row.TruckID}>
                                        <TableCell>{new Date(row.lastDriven).toLocaleDateString()}</TableCell>
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
                                        <TableCell align="right">{row.driveCount}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    </Box>
                </>
            ) : null}

            {tabValue === 1 ? (
                <DriverProfileForms
                    driver={initialDriver}
                    entityDrivers={entityDrivers}
                    allForms={allForms}
                    mode={mode}
                />
            ) : null}
        </>
    );
};

export default Driver;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;

    let initialDriver: DriverFormsDataType | undefined;
    let trucksDriven: TruckDrivenRow[] = [];
    let entityDrivers: DriverFormsDataType[] = [];
    let allForms: CompleteFormOptions[] = [];
    let mode: "w2" | "oo" = "w2";

    if (id && typeof(id) === "string") {
        const row = await prisma.drivers.findFirst({
            where: {
                ID: parseInt(id)
            },
            include: {
                DriverForms: true,
                States: true,
                Carriers: {include: {States: true}},
            },
        });
        if (row) {
            initialDriver = JSON.parse(JSON.stringify(row)) as DriverFormsDataType;
            const driverId = parseInt(id);
            const grouped = await prisma.trucksDriven.groupBy({
                by: ["TruckID"],
                where: {DriverID: driverId},
                _max: {DateDriven: true},
                _count: {_all: true},
                orderBy: {_max: {DateDriven: "desc"}},
            });
            const truckIds = grouped.map((g) => g.TruckID);
            const trucks =
                truckIds.length > 0
                    ? await prisma.trucks.findMany({where: {ID: {in: truckIds}}})
                    : [];
            const truckMap = Object.fromEntries(trucks.map((t) => [t.ID, t]));
            trucksDriven = grouped.map((g) => ({
                TruckID: g.TruckID,
                lastDriven: g._max.DateDriven!.toISOString(),
                driveCount: g._count._all,
                Trucks: truckMap[g.TruckID] ?? null,
            }));
            trucksDriven = JSON.parse(JSON.stringify(trucksDriven)) as TruckDrivenRow[];
            mode = initialDriver.OwnerOperator ? "oo" : "w2";

            if (mode === "oo" && initialDriver.CarrierID != null && initialDriver.CarrierID > 0) {
                const siblings = await prisma.drivers.findMany({
                    where: {
                        OwnerOperator: true,
                        CarrierID: initialDriver.CarrierID,
                        OR: [{Deleted: false}, {Deleted: null}],
                    },
                    include: entityDriverInclude,
                });
                entityDrivers = JSON.parse(JSON.stringify(siblings)) as DriverFormsDataType[];
            } else if (mode === "oo") {
                const solo = await prisma.drivers.findFirst({
                    where: {ID: initialDriver.ID},
                    include: entityDriverInclude,
                });
                entityDrivers = solo
                    ? [JSON.parse(JSON.stringify(solo)) as DriverFormsDataType]
                    : [initialDriver];
            } else {
                entityDrivers = [initialDriver];
            }

            allForms = JSON.parse(JSON.stringify(
                await prisma.formOptions.findMany({
                    where: mode === "w2" ? {W2Visible: true} : {OOVisible: true},
                    include: {Forms: true},
                    orderBy: [{Forms: {DisplayName: "asc"}}, {Form: "asc"}],
                }),
            )) as CompleteFormOptions[];
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

    const tabQuery = Array.isArray(context.query.tab) ? context.query.tab[0] : context.query.tab;
    const initialTab = tabQuery === "forms" ? 1 : 0;

    return {
        props: {
            states,
            initialDriver,
            trucksDriven,
            entityDrivers,
            allForms: allForms,
            mode,
            initialTab,
        }
    }
}
