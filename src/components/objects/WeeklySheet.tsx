import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import AttachMoney from '@mui/icons-material/AttachMoney';
import DoneIcon from '@mui/icons-material/Done';
import Button from "@mui/material/Button";
import Grid2 from "@mui/material/Unstable_Grid2";
import moment from "moment";
import React, {useEffect, useState} from "react";
import TextField from "@mui/material/TextField";
import {toast} from "react-toastify";
import {z} from "zod";
import {
    CompleteJobs,
    LoadsModel,
    DriversModel,
    JobsModel,
    CustomersModel,
    TrucksModel,
    LoadTypesModel, DeliveryLocationsModel,
    InvoicesModel
} from "../../../prisma/zod";
import Tooltip from '@mui/material/Tooltip';
import {confirmAlert} from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import {trpc} from "../../utils/trpc";

type Driver = z.infer<typeof DriversModel>;

type Truck = z.infer<typeof TrucksModel>;

type Loads = z.infer<typeof LoadsModel>;

type Invoice = z.infer<typeof InvoicesModel>;

interface LoadsInvoices extends Loads {
    Invoices: Invoice
}

type Customer = z.infer<typeof CustomersModel>;

type LoadType = z.infer<typeof LoadTypesModel>;

type DeliveryLocation = z.infer<typeof DeliveryLocationsModel>;

interface DriversLoads extends Driver {
    Loads: LoadsInvoices[],
    Trucks: Truck
}

interface Sheet extends LoadType {
    DeliveryLocations: DeliveryLocation,
    DriversTrucks: DriversLoads[],
}

interface CustomerSheet extends Customer {
    Sheets: Sheet[],
}

// const printDailySheet = trpc.useMutation("dailies.postPrinted", {
//     async onSuccess() {
//         toast("Successfully Generated!", { autoClose: 2000, type: "success" });
//     },
// });

const WeeklySheet = ({
                         customer,
                         week,
                         forceExpand
                     }: { customer: CustomerSheet, week: string, forceExpand: boolean }) => {
    const [isOpen, setIsOpen] = useState(forceExpand);

    useEffect(() => {
        setIsOpen(forceExpand)
    }, [forceExpand])

    return (
        <div style={{padding: 5}}>
            <Grid2 container columnSpacing={2}>
                <Grid2 xs={"auto"}>
                    <Button
                        variant="text"
                        type={"button"}
                        size="small"
                        style={{
                            minHeight: "30px",
                            maxHeight: "30px",
                            minWidth: "30px",
                            maxWidth: "30px",
                        }}
                        color="inherit"
                        onClick={() => {
                            setIsOpen(!isOpen);
                        }}
                    >
                        {isOpen ? (
                            <ExpandMore sx={{fontSize: 30}}/>
                        ) : (
                            <ChevronRight sx={{fontSize: 30}}/>
                        )}
                    </Button>
                </Grid2>
                <Grid2 xs={"auto"} sx={{display: "flex"}}>
                    <b style={{fontSize: 18, marginLeft: 3}}>
                        {customer.Name}
                    </b>
                </Grid2>
                <Grid2 xs={true}></Grid2>
                <Grid2 xs={"auto"} sx={{paddingRight: 2}}>
                    <Button
                        variant="contained"
                        color={"primary"}
                        style={{backgroundColor: "#ffa726"}}
                        onClick={async () => {
                            toast("Generating PDF...", {autoClose: 2000, type: "info"});
                            const element = document.createElement("a");
                            element.href = `/api/getPDF/daily/${customer.ID}|${week}`;
                            element.download = "daily-download.pdf";
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                            // await printInvoice.mutateAsync({
                            //     ...initialInvoice,
                            //     selected: [],
                            // });
                        }}
                    >
                        Print Week
                    </Button>
                </Grid2>
            </Grid2>
            <div
                style={{
                    overflow: "hidden",
                    height: isOpen ? "auto" : 0,
                    paddingBottom: 10,
                }} className={'customer-sheets-container-' + customer.ID}
            >
                {customer.Sheets?.map(
                    (sheet: Sheet, index: number) =>
                        <Sheet sheet={sheet} key={"sheet-" + index + '-' + customer.ID} week={week}/>
                )}
            </div>
        </div>
    );
};

export default WeeklySheet;

const Sheet = ({sheet, week}: { sheet: Sheet, week: string }) => {
    const [sheetState, setSheetState] = useState<Sheet>(sheet);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const sums: any = {};

    for (let i = 0; i < 7; i++) {
        sums[moment(week).add(i, "days").format("MM/DD")] = 0
        sheet.DriversTrucks.map((driverTruck) => {
            sums[moment(week).add(i, "days").format("MM/DD")] += driverTruck.Loads.filter((item) => moment(item.Created).format("MM/DD") === moment(week).add(i, "days").format("MM/DD")).reduce((acc, obj) => {
                return acc + (obj.Hours ? obj.Hours : obj.Weight ? obj.Weight : 0)
            }, 0)
        });
    }

    const [sumsState, setSumsState] = useState(sums);

    return (
        <div key={"sheet-" + sheet.ID + '|' + sheet.DeliveryLocations?.ID} style={{paddingBottom: 10}}>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 15,
                paddingLeft: 5,
                paddingRight: 5
            }}>
                <b style={{fontSize: 22}}>Material Delivered - {sheet.Description}</b>
                <b style={{fontSize: 22}}>Job Site - {sheet.DeliveryLocations?.Description}</b>
            </div>

            <HeaderRow week={week}/>
            {sheetState.DriversTrucks.map((driverTruck, index) => {
                return (
                    <span key={'sheet-container' + driverTruck.ID}>

                        <DriverTruck driverTruck={driverTruck} index={index} week={week}
                                     key={"drivertruck-" + driverTruck.ID}/>

                        {index === sheetState.DriversTrucks.length - 1 &&
                            <TotalsRow sheet={sheet} index={index} sums={sums} key={"totalrow-" + driverTruck.ID}
                                       week={week} driverTruck={driverTruck}/>}

                    </span>
                )
            })}
        </div>
    );
}

const TotalsRow = ({
                       index,
                       sheet,
                       sums,
                       week,
                       driverTruck
                   }: { index: number, sheet: Sheet, sums: any[], week: string, driverTruck: DriversLoads }) => {
    const [sheetState, setSheetState] = useState(sheet);
    const [isInvoiced, setIsInvoiced] = useState(driverTruck.Loads[0]?.Invoiced);
    const [isPaid, setIsPaid] = useState(driverTruck.Loads[0]?.Invoices?.Paid)


    // const postJobClosed = trpc.useMutation("jobs.postClosed", {
    //     async onSuccess() {
    //         toast("Success!", {autoClose: 2000, type: "success"});
    //     },
    // });
    //
    // const postJobPaid = trpc.useMutation("jobs.postPaid", {
    //     async onSuccess() {
    //         toast("Success!", {autoClose: 2000, type: "success"});
    //     },
    // });

    return (
        <Grid2
            container
            rowSpacing={2}
            sx={{
                border: "1px solid black",
                marginTop: 1,
                backgroundColor: isPaid ? "#88ff83" : isInvoiced ? "#8991ff" : "#bababa",
            }}
        >
            <b style={{marginLeft: 5, paddingRight: 5, width: 65, fontSize: 21}}></b>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                    borderLeft: "2px solid black",
                }}
                xs={2}
            >
                <b style={{fontSize: 21}}></b>
            </Grid2>

            {["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"].map((day, index) =>

                    <Grid2
                        sx={{textAlign: "center", borderRight: "2px solid black"}}
                        xs={true}
                        key={'day-totals-' + day}
                    >

                        {/*                    eslint-disable-next-line @typescript-eslint/ban-ts-comment*/}
                        {/*@ts-ignore*/}
                        <b style={{fontSize: 17}}>{sums[moment(week).add(index, "days").format("MM/DD")]}</b>

                    </Grid2>

                )}

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >


                <b style={{fontSize: 17}}>{Object.keys(sums).reduce((acc, obj) => {
                    //eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    //@ts-ignore
                    return acc + sums[obj]
                }, 0)}</b>


            </Grid2>

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >
                {/*<TextField*/}
                {/*    variant={'standard'}*/}
                {/*    value={jobState.CompanyRevenue !== null ? jobState.CompanyRevenue : weightSum * (load.TruckRate ? load.TruckRate : 0)}*/}
                {/*    onChange={(e) => {*/}
                {/*        setJobState(prevState => ({*/}
                {/*            ...prevState,*/}
                {/*            CompanyRevenue: parseFloat(e.currentTarget.value ? e.currentTarget.value : '0')*/}
                {/*        }));*/}
                {/*    }}*/}
                {/*/>*/}
            </Grid2>
        </Grid2>
    )
}

const DriverTruck = ({
                         driverTruck,
                         index,
                         week,

                     }: { driverTruck: DriversLoads, index: number, week: string }) => {
    return (
        <Grid2
            container
            rowSpacing={2}
            sx={{border: "1px solid black", marginTop: 1}}
        >
            <b style={{
                marginLeft: 5,
                paddingRight: 5,
                width: 65,
                fontSize: 16
            }}>{driverTruck.Trucks?.Notes ? driverTruck.Trucks?.Notes.split('#').length > 1 ? driverTruck.Trucks?.Notes.split('#')[1] : 'N/A' : 'N/A'}</b>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                    borderLeft: "2px solid black",
                }}
                xs={2}
            >
                <b style={{fontSize: 17}}>{driverTruck.FirstName + " " + driverTruck.LastName}</b>
            </Grid2>

            {["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"].map((day, index) =>
                    <Grid2
                        sx={{textAlign: "center", borderRight: "2px solid black"}}
                        xs={true}
                        key={'day-data-' + day}
                    >

                        {/*                    eslint-disable-next-line @typescript-eslint/ban-ts-comment*/}
                        {/*@ts-ignore*/}
                        <b style={{fontSize: 17}}>{driverTruck.Loads.filter((item) => moment(item.Created).format("MM/DD") === moment(week).add(index, "days").format("MM/DD")).reduce((acc, obj) => {
                            return acc + (obj.Hours ? obj.Hours : obj.Weight ? obj.Weight : 0)
                        }, 0)}</b>

                    </Grid2>
                )}

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >

                <b style={{fontSize: 17}}>{driverTruck.Loads.reduce((acc, obj) => {
                    return acc + (obj.Hours ? obj.Hours : obj.Weight ? obj.Weight : 0)
                }, 0)}</b>

            </Grid2>

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >

                <b style={{fontSize: 17}}>{/*textfield for rate?*/}</b>

            </Grid2>
        </Grid2>
    );
}

const HeaderRow = ({week}: { week: string }) => {
    return (
        <Grid2
            container
            rowSpacing={2}
            sx={{border: "1px solid black", marginTop: 1}}
        >
            <b style={{marginLeft: 5, paddingRight: 5, width: 65, fontSize: 16}}>TRK #</b>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                    borderLeft: "2px solid black",
                    padding: 0
                }}
                xs={2}
            >
                <b style={{fontSize: 21}}>Driver</b>
            </Grid2>

            {["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"].map((day, index) =>
                <Grid2
                    sx={{textAlign: "center", borderRight: "2px solid black", padding: 0}}
                    xs={true}
                    key={"day-" + day}
                >
                    <Grid2 sx={{textAlign: "center"}} xs={true} container>
                        <Grid2 xs={12} sx={{padding: 0, borderBottom: 2}}>
                            <b style={{fontSize: 17}}>{day}</b>
                        </Grid2>
                        <Grid2 xs={12} sx={{padding: 0}}>
                            <b style={{fontSize: 17}}>{moment(week).add(index, "days").format("MM/DD")}</b>
                        </Grid2>
                    </Grid2>
                </Grid2>
            )}

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black", padding: 0}}
                xs={true}
            >
                <Grid2 sx={{textAlign: "center"}} xs={true} container>
                    <Grid2 xs={12} sx={{padding: 0, borderBottom: 2}}>
                        <b style={{fontSize: 17}}>Total</b>
                    </Grid2>
                    <Grid2 xs={12} sx={{padding: 0}}>
                        <b style={{fontSize: 17}}>Weight</b>
                    </Grid2>
                </Grid2>
            </Grid2>

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black", padding: 0}}
                xs={true}
            >
                <Grid2 sx={{textAlign: "center"}} xs={true} container>
                    <Grid2 xs={12} sx={{padding: 0, borderBottom: 2}}>
                        <b style={{fontSize: 17}}>Mult</b>
                    </Grid2>
                    <Grid2 xs={12} sx={{padding: 0}}>
                        <b style={{fontSize: 17}}>{/*textfield for rate?*/}</b>
                    </Grid2>
                </Grid2>
            </Grid2>
        </Grid2>
    )
}