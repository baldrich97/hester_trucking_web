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
    CompleteCustomers,
    TrucksModel,
    LoadTypesModel, DeliveryLocationsModel,
    InvoicesModel, CompleteWeeklies,
    CompleteDeliveryLocations,
    CompleteLoadTypes
} from "../../../prisma/zod";
import Tooltip from '@mui/material/Tooltip';
import {confirmAlert} from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import {trpc} from "../../utils/trpc";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import PayStub from "./PayStub";
import Modal from "@mui/material/Modal";
import BasicAutocomplete from "../../elements/Autocomplete";

type DeliveryLocation = z.infer<typeof DeliveryLocationsModel>;

type LoadType = z.infer<typeof LoadTypesModel>;

interface CustomerSheet extends CompleteWeeklies {
    Customers: CompleteCustomers,
    Jobs: CompleteJobs[],
    DeliveryLocations: CompleteDeliveryLocations,
    LoadTypes: CompleteLoadTypes
}

// const printDailySheet = trpc.useMutation("dailies.postPrinted", {
//     async onSuccess() {
//         toast("Successfully Generated!", { autoClose: 2000, type: "success" });
//     },
// });

const WeeklySheet = ({
                         weekly,
                         week,
                         forceExpand,
                         initialExpand = null,
                         forceRefresh = null,
                     }: { weekly: CustomerSheet, week: string, forceExpand: boolean, initialExpand: any, forceRefresh: any }) => {
    const [isOpen, setIsOpen] = useState(forceExpand);
    const [openWeeklyModal, setOpenWeeklyModal] = useState(false)

    const [weeklyCustomer, setWeeklyCustomer] = useState(weekly.CustomerID)
    const [weeklyLoadType, setWeeklyLoadType] = useState(weekly.LoadTypeID)
    const [weeklyDeliveryLocation, setWeeklyDeliveryLocation] = useState(weekly.DeliveryLocationID)

    const updateWeekly = trpc.useMutation("weeklies.post", {
        async onSuccess(data) {
            toast("Successfully Paid!", {autoClose: 2000, type: "success"});
            setOpenWeeklyModal(false);
            if (typeof(forceRefresh) === 'function') {
                forceRefresh(true);
            }
        },
    });

    useEffect(() => {
        setIsOpen(initialExpand || forceExpand)
    }, [forceExpand, initialExpand])

    const [sheet, setSheet] = useState<CustomerSheet>(weekly);

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
                        {isOpen || initialExpand ? (
                            <ExpandMore sx={{fontSize: 30}}/>
                        ) : (
                            <ChevronRight sx={{fontSize: 30}}/>
                        )}
                    </Button>
                </Grid2>
                <Grid2 xs={"auto"} sx={{display: "flex"}}>
                    <b style={{fontSize: 18, marginLeft: 3}}>
                        {sheet.Customers.Name} | {sheet.LoadTypes.Description} | {sheet.DeliveryLocations.Description}
                    </b>
                </Grid2>
                <Grid2 xs={true}></Grid2>
                {sheet.LastPrinted && <Grid2 xs={"auto"} sx={{display: 'grid', alignItems: 'center'}}>
                    Last Printed: {moment(sheet.LastPrinted).format('MM/DD h:mm A')}
                </Grid2>}
                <Grid2 xs={"auto"} sx={{paddingRight: 2}}>
                    <Button
                        variant="contained"
                        color={"primary"}
                        style={{backgroundColor: "#ffa726"}}
                        onClick={async () => {
                            confirmAlert({
                                title: "Confirm Weekly Edit",
                                message: "Editing this Weekly will apply the changes to ALL associated Loads, Jobs, and Dailies. If you need to change only SOME Loads, Jobs, or Dailies please edit the Loads individually. Are you sure you want to change ALL Loads for ALL Drivers?",
                                buttons: [
                                    {
                                        label: "Yes",
                                        onClick: async () => {
                                            setOpenWeeklyModal(true);
                                        },
                                    },
                                    {
                                        label: "No",
                                        //onClick: () => {}
                                    },
                                ],
                            });
                        }}
                    >
                        Edit Weekly
                    </Button>
                </Grid2>
                <Grid2 xs={"auto"} sx={{paddingRight: 2}}>
                    <Button
                        variant="contained"
                        color={"primary"}
                        style={{backgroundColor: "#ffa726"}}
                        onClick={async () => {
                            toast("Generating PDF...", {autoClose: 2000, type: "info"});
                            const element = document.createElement("a");
                            element.href = `/api/getPDF/weekly/${sheet.ID}|${week}`;
                            element.download = "weekly-download.pdf";
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                            setSheet({...weekly, LastPrinted: new Date})
                        }}
                    >
                        Print Week
                    </Button>
                </Grid2>
                {sheet.InvoiceID && <Grid2 xs={"auto"} sx={{paddingRight: 2}}>
                    <NextLink
                        href={`invoices/${sheet.InvoiceID}`}
                        passHref
                    >
                        <a target={"_blank"}>
                            <Button color={"primary"} variant={"contained"} style={{backgroundColor: '#1976d2'}}>
                                To Invoice
                            </Button>
                        </a>
                    </NextLink>
                </Grid2>}
            </Grid2>
            <div
                style={{
                    overflow: "hidden",
                    height: isOpen ? "auto" : 0,
                    paddingBottom: 10,
                }} className={'weekly-sheets-container-' + sheet.ID}
            >
                <Sheet weekly={sheet} key={"sheet-" + sheet.ID} week={week}/>
            </div>

            <Modal
                open={openWeeklyModal}
                onClose={async () => {
                    setOpenWeeklyModal(false)
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '75rem',
                        bgcolor: 'background.paper',
                        boxShadow: 24,
                        borderRadius: 2,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        '&::-webkit-scrollbar': {display: 'none'},
                        scrollbarWidth: 'none',
                    }}
                >
                    {/* Modal Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #e0e0e0',
                        }}
                    >
                        <Typography variant="h6" id="weekly-modal-title">
                            Weekly Edit
                        </Typography>
                    </Box>

                    {/* Modal Content */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowX: 'hidden', // Ensure content never scrolls
                            overflowY: 'scroll',
                            padding: '10px'
                        }}
                    >
                        <div style={{display: "flex", flexDirection: "column"}}>
                            <div style={{width: "100%", paddingBottom: 5}}>
                                <BasicAutocomplete
                                    optionLabel={"Name+|+Street+,+City"}
                                    optionValue={"ID"}
                                    searchQuery={"customers"}
                                    data={[weekly.Customers]}
                                    label={"Customer"}
                                    defaultValue={weeklyCustomer}
                                    onSelect={(customer: any) => {
                                        setWeeklyCustomer(customer);
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    paddingBottom: 5,
                                }}
                            >
                                <div style={{width: "48%"}}>
                                    <BasicAutocomplete
                                        optionLabel={"Description"}
                                        optionValue={"ID"}
                                        searchQuery={"loadtypes"}
                                        data={[weekly.LoadTypes]}
                                        label={"Load Type"}
                                        defaultValue={weeklyLoadType}
                                        onSelect={(loadType: any) => {
                                            setWeeklyLoadType(loadType);
                                        }}
                                    />
                                </div>
                                <div style={{width: "48%"}}>
                                    <BasicAutocomplete
                                        optionLabel={"Description"}
                                        optionValue={"ID"}
                                        searchQuery={"deliverylocations"}
                                        data={[weekly.DeliveryLocations]}
                                        label={"Delivery Location"}
                                        defaultValue={weeklyDeliveryLocation}
                                        onSelect={(deliveryLocation: any) => {
                                            setWeeklyDeliveryLocation(deliveryLocation);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </Box>

                    <Box sx={{mt: 2, justifyContent: 'space-between', display: "flex"}}>
                        <Button
                            variant={"contained"}
                            color={"success"}
                            style={{backgroundColor: "#66bb6a"}}
                            onClick={async () => {
                                const changed = JSON.parse(JSON.stringify(weekly));
                                changed.DeliveryLocationID = weeklyDeliveryLocation === 0 ? weekly.DeliveryLocationID : weeklyDeliveryLocation;
                                changed.LoadTypeID = weeklyLoadType === 0 ? weekly.LoadTypeID : weeklyLoadType;
                                changed.CustomerID = weeklyCustomer === 0 ? weekly.CustomerID : weeklyCustomer;
                                await updateWeekly.mutateAsync(changed);
                            }}
                        >
                            Confirm Edit
                        </Button>

                        <Button
                            variant={"contained"}
                            style={{backgroundColor: "#757575"}}
                            onClick={async () => {
                                setWeeklyDeliveryLocation(weekly.DeliveryLocationID)
                                setWeeklyCustomer(weekly.CustomerID)
                                setWeeklyLoadType(weekly.LoadTypeID)
                                setOpenWeeklyModal(false)
                            }}
                        >
                            Cancel
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </div>
    );
};

export default WeeklySheet;

const Sheet = ({weekly, week}: { weekly: CustomerSheet, week: string }) => {
    const [sheetState, setSheetState] = useState<CustomerSheet>(weekly);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const sums: any = {};

    weekly.Jobs.map((job) => {
        for (let i = 0; i < 7; i++) {
            sums[moment(week).add(i, "days").format("MM/DD")] = sums[moment(week).add(i, "days").format("MM/DD")] ?? 0
            sums[moment(week).add(i, "days").format("MM/DD")] += job.Loads.filter((item) => moment.utc(item.StartDate, "YYYY-MM-DD").format("MM/DD") === moment(week).add(i, "days").format("MM/DD")).reduce((acc, obj) => {
                return acc + (obj.Hours ? obj.Hours : obj.Weight ? obj.Weight : 0)
            }, 0)
        }
    })

    const [sumsState, setSumsState] = useState(sums);

    return (
        <div key={"sheet-" + weekly.ID + '|' + weekly.DeliveryLocationID} style={{paddingBottom: 10}}>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 15,
                paddingLeft: 5,
                paddingRight: 5
            }}>
                <b style={{fontSize: 22}}>Material Delivered - {weekly.LoadTypes?.Description}</b>
                <b style={{fontSize: 22}}>Job Site - {weekly.DeliveryLocations?.Description}</b>
            </div>

            <HeaderRow week={week} weekly={sheetState} setSheetState={setSheetState}/>
            {sheetState.Jobs.map((job, index) => {
                return (
                    <span key={'sheet-container' + job.ID}>

                        <Job job={job} index={index} week={week}
                             key={"job-" + job.ID}/>

                        {index === sheetState.Jobs.length - 1 &&
                            <TotalsRow weekly={sheetState} setSheetState={setSheetState} index={index} sums={sums}
                                       key={"totalrow-" + job.ID}
                                       week={week} job={job}/>}

                    </span>
                )
            })}
        </div>
    );
}

const TotalsRow = ({
                       index,
                       weekly,
                       sums,
                       week,
                       job,
                       setSheetState
                   }: {
    index: number,
    weekly: CustomerSheet,
    sums: any[],
    week: string,
    job: CompleteJobs,
    setSheetState: any
}) => {
    const [isInvoiced, setIsInvoiced] = useState(job.Loads[0]?.Invoiced);
    const [isPaid, setIsPaid] = useState(job.Loads[0]?.Invoices?.Paid)
    const [isClosed, setIsClosed] = useState(weekly.Revenue !== null);
    const weightSum = Object.keys(sums).reduce((acc, obj) => {
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        return acc + sums[obj]
    }, 0);

    const postWeeklyClosed = trpc.useMutation("weeklies.postClosed", {
        async onSuccess() {
            toast("Success!", {autoClose: 2000, type: "success"});
        },
    });

    return (
        <Grid2
            container
            rowSpacing={2}
            sx={{
                border: "1px solid black",
                marginTop: 1,
                backgroundColor: weekly.InvoiceID ? "#88ff83" : isClosed ? "#8991ff" : "#bababa",
            }}
        >
            <b style={{width: 70, display: 'grid', alignItems: 'center', justifyItems: 'center'}}>
                <Tooltip
                    title={isClosed ? 'Revenue already saved.' : 'Save the revenue for this weekly.'}>
                    <span>
                        <Button
                            variant="contained"
                            color={"primary"}
                            style={{backgroundColor: weekly.InvoiceID ? "#0aa201" : isClosed ? "#88ff83" : "#181eff"}}
                            sx={{minWidth: 30, minHeight: 30, maxWidth: 30, maxHeight: 30}}
                            disabled={isClosed}
                            onClick={async () => {
                                confirmAlert({
                                    title: "Confirm Weekly Closure",
                                    message: "This will close the weekly. Any future loads similar to this weekly will be on their own weekly. This cannot be undone, are you sure?",
                                    buttons: [
                                        {
                                            label: "Yes",
                                            onClick: async () => {
                                                const data = await postWeeklyClosed.mutateAsync({
                                                    ...weekly,
                                                    Revenue: weekly.Revenue ? parseFloat(weekly.Revenue.toString()) : (Math.round(weightSum * (weekly.CompanyRate ? weekly.CompanyRate : 0) * 100) / 100),
                                                    TotalWeight: (Math.round(weightSum * 100) / 100)
                                                });
                                                setSheetState((prevState: any) => ({
                                                    ...prevState,
                                                    ...data
                                                }));
                                                setIsClosed(true);
                                            },
                                        },
                                        {
                                            label: "No",
                                            //onClick: () => {}
                                        },
                                    ],
                                });
                            }}
                        >
                        {<DoneIcon/>}
                    </Button>
                    </span>
                </Tooltip>
            </b>
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
                    <b style={{fontSize: 17}}>{(Math.round(sums[moment(week).add(index, "days").format("MM/DD")] * 100) / 100)}</b>

                </Grid2>
            )}

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >


                <b style={{fontSize: 17}}>{weekly.TotalWeight ?? (Math.round(weightSum * 100) / 100)}</b>


            </Grid2>

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >
                <TextField
                    variant={'standard'}
                    sx={{paddingLeft: 1, fontWeight: 'bolder'}}
                    value={weekly.Revenue !== null ? weekly.Revenue : (Math.round(weightSum * (weekly.CompanyRate ? weekly.CompanyRate : 0) * 100) / 100)}
                    onChange={(e) => {
                        setIsClosed(false)
                        let value = 0;
                        if (e.currentTarget?.value) {
                            const str = e.currentTarget.value.replace(/[^0-9.]/g, '')
                            if (str.indexOf('.') === str.length - 1 || str.indexOf('0') === str.length - 1) {
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                value = str;
                            } else {
                                value = parseFloat(str)
                            }
                        } else {
                            value = 0;
                        }
                        setSheetState((prevState: any) => ({
                            ...prevState,
                            Revenue: value,
                        }));
                    }}
                />
            </Grid2>
        </Grid2>
    )
}

const Job = ({
                 job,
                 index,
                 week,

             }: { job: CompleteJobs, index: number, week: string }) => {
    if (!job.Loads[0]) {
        return null;
    }
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
            }}>{job.Loads[0].Trucks?.Notes ? job.Loads[0].Trucks?.Notes.split('#').length > 1 ? job.Loads[0].Trucks?.Notes.split('#')[1] : 'N/A' : 'N/A'}</b>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                    borderLeft: "2px solid black",
                }}
                xs={2}
            >
                <b style={{fontSize: 17}}>{job.Drivers.FirstName + " " + job.Drivers.LastName}</b>
            </Grid2>

            {["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"].map((day, index) =>
                <Grid2
                    sx={{textAlign: "center", borderRight: "2px solid black"}}
                    xs={true}
                    key={'day-data-' + day}
                >

                    {/*                    eslint-disable-next-line @typescript-eslint/ban-ts-comment*/}
                    {/*@ts-ignore*/}
                    <b style={{fontSize: 17}}>{(Math.round(job.Loads.filter((item) => moment.utc(item.StartDate, "YYYY-MM-DD").format("MM/DD") === moment(week).add(index, "days").format("MM/DD")).reduce((acc, obj) => {
                        return acc + (obj.Hours ? obj.Hours : obj.Weight ? obj.Weight : 0)
                    }, 0) * 100) / 100)}</b>

                </Grid2>
            )}

            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >

                <b style={{fontSize: 17}}>{(Math.round(job.Loads.reduce((acc, obj) => {
                    return acc + (obj.Hours ? obj.Hours : obj.Weight ? obj.Weight : 0)
                }, 0) * 100) / 100)}</b>

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

const HeaderRow = ({week, weekly, setSheetState}: { week: string, weekly: CustomerSheet, setSheetState: any }) => {
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
                    <Grid2 sx={{textAlign: "center", display: 'grid'}} container>
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
                <Grid2 sx={{textAlign: "center", display: 'grid'}} container>
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
                <Grid2 sx={{textAlign: "center", display: 'grid'}} container>
                    <Grid2 xs={12} sx={{padding: 0, borderBottom: 2}}>
                        <b style={{fontSize: 17}}>C. Rate</b>
                    </Grid2>
                    <Grid2 xs={12} sx={{padding: 0}}>
                        <TextField
                            variant={'standard'}
                            sx={{paddingLeft: 1, fontWeight: 'bolder'}}
                            value={weekly.CompanyRate ? weekly.CompanyRate : 0}
                            onChange={(e) => {
                                let value = 0;
                                if (e.currentTarget?.value) {
                                    const str = e.currentTarget.value.replace(/[^0-9.]/g, '')
                                    if (str.indexOf('.') === str.length - 1 || str.indexOf('0') === str.length - 1) {
                                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                                        value = str;
                                    } else {
                                        value = parseFloat(str)
                                    }
                                } else {
                                    value = 0;
                                }
                                setSheetState((prevState: any) => ({
                                    ...prevState,
                                    CompanyRate: value,
                                }));
                            }}
                        />
                    </Grid2>
                </Grid2>
            </Grid2>
        </Grid2>
    )
}