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
import {CompleteJobs, LoadsModel, DriversModel, DailiesModel} from "../../../prisma/zod";
import Tooltip from '@mui/material/Tooltip';
import {confirmAlert} from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import {trpc} from "../../utils/trpc";
import NextLink from "next/link";

type Loads = z.infer<typeof LoadsModel>;

type Driver = z.infer<typeof DriversModel>;

type Daily = z.infer<typeof DailiesModel>;

interface DriverSheet extends Daily {
    Drivers: Driver,
    Jobs: CompleteJobs[],
    initialExpand?: any
}

// const printDailySheet = trpc.useMutation("dailies.postPrinted", {
//     async onSuccess() {
//         toast("Successfully Generated!", { autoClose: 2000, type: "success" });
//     },
// });

const DailySheet = ({sheet, week, forceExpand, initialExpand = null,}: { sheet: DriverSheet, week: string, forceExpand: boolean, initialExpand: any  }) => {
    const [isOpen, setIsOpen] = useState(forceExpand);

    useEffect(() => {
        setIsOpen(initialExpand || forceExpand)
    }, [forceExpand, initialExpand])

    const [daily, setDaily] = useState<DriverSheet>(sheet);

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
                        {daily.Drivers.FirstName} {daily.Drivers.LastName}
                    </b>
                </Grid2>
                <Grid2 xs={true}></Grid2>
                {daily.LastPrinted && <Grid2 xs={"auto"} sx={{display: 'grid', alignItems: 'center'}}>
                    Last Printed: {moment(daily.LastPrinted).format('MM/DD h:mm A')}
                </Grid2>}
                <Grid2 xs={"auto"} sx={{paddingRight: 2}}>
                    <Button
                        variant="contained"
                        color={"primary"}
                        style={{backgroundColor: "#ffa726"}}
                        onClick={async () => {
                            if (daily.LastPrinted) {
                                confirmAlert({
                                    customUI: ({ onClose }) => {
                                        return (
                                            <div className="react-confirm-alert" style={{ width: '800px' }}> {/* Adjust width here */}
                                                <div className="react-confirm-alert-body" style={{width: '100%'}}>
                                                    <h1>Daily Sheet Print Options</h1>
                                                    <p>This Daily has already been printed. Do you want to print out only loads created after the last print date, or print the entire sheet?</p>
                                                    <div className="react-confirm-alert-button-group">
                                                        <button   onClick={async () => {
                                                            toast("Generating PDF...", {autoClose: 2000, type: "info"});
                                                            const element = document.createElement("a");
                                                            element.href = `/api/getPDF/daily/${daily.ID}|${week}|partial`;
                                                            element.download = "daily-download.pdf";
                                                            document.body.appendChild(element);
                                                            element.click();
                                                            document.body.removeChild(element);
                                                            setDaily({...daily, LastPrinted: new Date})
                                                            onClose();
                                                        }}>New Data Only/Partial Sheet</button>
                                                        <button
                                                            onClick={async () => {
                                                                toast("Generating PDF...", {autoClose: 2000, type: "info"});
                                                                const element = document.createElement("a");
                                                                element.href = `/api/getPDF/daily/${daily.ID}|${week}|full`;
                                                                element.download = "daily-download.pdf";
                                                                document.body.appendChild(element);
                                                                element.click();
                                                                document.body.removeChild(element);
                                                                setDaily({...daily, LastPrinted: new Date})
                                                                onClose();
                                                            }}
                                                        >
                                                            All Data/Full Sheet
                                                        </button>
                                                        <button style={{marginLeft: 'auto'}} onClick={onClose}>Close</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    },
                                });
                            }
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
                }}
            >
                <HeaderRow/>
                {daily.Jobs?.map(
                    (job: CompleteJobs) =>
                        <Job job={job} key={"job-" + job.ID} ownerOperator={daily.Drivers.OwnerOperator}/>
                )}
            </div>
        </div>
    );
};

export default DailySheet;

const Job = ({job, ownerOperator}: { job: CompleteJobs, ownerOperator: boolean }) => {
    const [jobState, setJobState] = useState<CompleteJobs>(job);

    let weightSum = 0;
    return (
        <div key={"job-" + job.ID}>
            {jobState.Loads.sort((a, b) => a.StartDate.getTime() - b.StartDate.getTime()).map((load, index) => {
                weightSum += load.Weight ? load.Weight : load.Hours ? load.Hours : 0;
                weightSum = Math.round(weightSum * 100) / 100
                return (
                    <span key={'job-container' + load.ID}>
                           <Load load={load} job={job} index={index} key={"load-" + load.ID}/>
                        {index === jobState.Loads.length - 1 &&
                            <TotalsRow job={job} index={index} load={load} weightSum={weightSum}
                                       key={"totalrow-" + job.ID} ownerOperator={ownerOperator}/>}
                        </span>
                )
            })}
        </div>
    );
}

const TotalsRow = ({
                       index,
                       job,
                       load,
                       weightSum,
                       ownerOperator,

                   }: { index: number, job: CompleteJobs, load: Loads, weightSum: number, ownerOperator: boolean}) => {
    const [jobState, setJobState] = useState(job);
    const [isClosed, setIsClosed] = useState(job.TruckingRevenue !== null || job.CompanyRevenue !== null);
    const [isPaidOut, setIsPaidOut] = useState(job.PaidOut)


    const postJobClosed = trpc.useMutation("jobs.postClosed", {
        async onSuccess() {
            toast("Success!", {autoClose: 2000, type: "success"});
        },
    });

    const postJobPaid = trpc.useMutation("jobs.postPaid", {
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
                backgroundColor: isPaidOut ? "#88ff83" : isClosed ? "#8991ff" : "#bababa",
            }}
        >

            <b style={{width: 50, display: 'grid', alignItems: 'center', justifyItems: 'center'}}>
                <Tooltip
                    title={isPaidOut ? 'This job has already been paid.' : isClosed ? 'Mark this job as paid out.' : 'Save the revenues for this job.'}>
                    <span>
                        <Button
                            variant="contained"
                            color={"primary"}
                            style={{backgroundColor: isPaidOut ? "#0aa201" : isClosed ? "#88ff83" : "#181eff"}}
                            sx={{minWidth: 30, minHeight: 30, maxWidth: 30, maxHeight: 30}}
                            disabled={isPaidOut}
                            onClick={async () => {
                                if (isClosed) {
                                    if (ownerOperator) {
                                        confirmAlert({
                                            title: "Confirm Owner Operator Payment",
                                            message: "Doing this will mark the job as paid out. This cannot be undone. Are you sure?",
                                            //TODO once pay stubs are set up add in here that it will automatically be done once a paystub is generated
                                            buttons: [
                                                {
                                                    label: "Yes",
                                                    onClick: async () => {
                                                        await postJobPaid.mutateAsync({
                                                            ...jobState,
                                                            PaidOut: true,
                                                        });
                                                        setIsPaidOut(true)
                                                    },
                                                },
                                                {
                                                    label: "No",
                                                    //onClick: () => {}
                                                },
                                            ],
                                        });
                                    } else {
                                        confirmAlert({
                                            title: "Confirm Company Employee Payment",
                                            message: "Doing this will mark the job as paid out. This cannot be undone. Are you sure?",
                                            //TODO once pay stubs are set up add in here that it will be automatically done once a paystub is generated
                                            buttons: [
                                                {
                                                    label: "Yes",
                                                    onClick: async () => {
                                                        await postJobPaid.mutateAsync({
                                                            ...jobState,
                                                            PaidOut: true,
                                                        });
                                                        setIsPaidOut(true)
                                                    },
                                                },
                                                {
                                                    label: "No",
                                                    //onClick: () => {}
                                                },
                                            ],
                                        });
                                    }
                                } else {
                                    confirmAlert({
                                        title: "Confirm Job Closure",
                                        message: "This will close the job. Any future loads similar to this job will be on their own job. To invoice this job, please close the weekly associated with it. This cannot be undone, are you sure?",
                                        buttons: [
                                            {
                                                label: "Yes",
                                                onClick: async () => {
                                                    const data = await postJobClosed.mutateAsync({
                                                        ...jobState,
                                                        TruckingRevenue: jobState.TruckingRevenue ? jobState.TruckingRevenue : (Math.round(weightSum * (load.DriverRate != load.TruckRate ? load.DriverRate ?? 0 : load.TruckRate ?? 0) * 100) / 100),
                                                        CompanyRevenue: jobState.CompanyRevenue ? jobState.CompanyRevenue : (Math.round(weightSum * (load.TotalRate ? load.TotalRate : 0) * 100) / 100)
                                                    });
                                                    setJobState(prevState => ({
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
                                }
                            }}
                        >
                        {job.PaidOut || isClosed ? <AttachMoney/> : <DoneIcon/>}
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
                xs={1.5}
            >

            </Grid2>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                }}
                xs={1.5}
            >

            </Grid2>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                }}
                xs={1.5}
            >

            </Grid2>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                }}
                xs={1}
            ></Grid2>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                }}
                xs={true}
            >

            </Grid2>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                }}
                xs={true}
            >

            </Grid2>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                }}
                xs={true}
            >

            </Grid2>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                }}
                xs={true}
            >

            </Grid2>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                }}
                xs={true}
            >
                {weightSum}
            </Grid2>
            <Grid2
                sx={{textAlign: "center"}}
                xs={1.5}
                container
            >
                <Grid2 sx={{textAlign: "center", borderRight: "2px solid black",}} xs={6}>
                    <TextField
                        variant={'standard'}
                        value={jobState.CompanyRevenue ? parseFloat(jobState.CompanyRevenue.toString()) : (Math.round(weightSum * (load.TotalRate ? load.TotalRate : 0) * 100) / 100)}
                        onChange={(e) => {
                            setIsClosed(false)
                            let value = 0;
                            if (e.currentTarget?.value) {
                                value = parseFloat(e.currentTarget.value)
                            } else {
                                value = 0;
                            }
                            setJobState(prevState => ({
                                ...prevState,
                                CompanyRevenue: value,
                            }));
                        }}
                    />
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                    }}
                    xs={6}
                >
                    <TextField
                        variant={'standard'}
                        value={jobState.TruckingRevenue ? parseFloat(jobState.TruckingRevenue.toString()) : (Math.round(weightSum * (load.DriverRate != load.TruckRate ? load.DriverRate ?? 0 : load.TruckRate ?? 0) * 100) / 100)}
                        onChange={(e) => {
                            let value = 0;
                            if (e.currentTarget?.value) {
                                value = parseFloat(e.currentTarget.value)
                            } else {
                                value = 0;
                            }
                            setJobState(prevState => ({
                                ...prevState,
                                TruckingRevenue: value,
                            }));
                        }}
                    />
                </Grid2>

            </Grid2>
        </Grid2>
    )
}

const Load = ({load, index, job}: { load: Loads, index: number, job: CompleteJobs }) => {
    return (
        <>
            <Grid2
                container
                rowSpacing={2}
                sx={{border: "1px solid black", marginTop: 1}}
            >
                <b
                    style={{marginLeft: 5, paddingRight: 5, width: 45}}
                >
                    {moment.utc(load.StartDate, "YYYY-MM-DD").format('M/D')}
                </b>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                        borderLeft: "2px solid black",
                    }}
                    xs={1.5}
                >
                    {index === 0
                        ? job.LoadTypes?.Description ?? "N/A"
                        : ""}
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                    }}
                    xs={1.5}
                >
                    {index === 0 ? job.Customers?.Name ?? "N/A" : ""}
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                    }}
                    xs={1.5}
                >
                    {index === 0
                        ? job.DeliveryLocations?.Description ?? "N/A"
                        : ""}
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                    }}
                    xs={1}
                >
                    <a href={`/loads/${load.ID}`} target={'_blank'}
                       style={{color: 'blue', fontWeight: 'bolder'}} rel="noreferrer">{load.TicketNumber ?? "N/A"}</a>
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                    }}
                    xs={true}
                >
                    {index === 0 ? load.MaterialRate ?? "N/A" : ""}
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                    }}
                    xs={true}
                >
                    {index === 0 ? load.TruckRate ?? "N/A" : ""}
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                    }}
                    xs={true}
                >
                    {index === 0 ? load.DriverRate ?? "N/A" : ""}
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                    }}
                    xs={true}
                >
                    {index === 0 ? load.TotalRate ?? "N/A" : ""}
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                    }}
                    xs={true}
                >
                    {load.Weight
                        ? load.Weight
                        : load.Hours
                            ? load.Hours
                            : "N/A"}
                </Grid2>
                <Grid2 sx={{textAlign: "center"}} xs={1.5} container>
                    <Grid2
                        sx={{
                            textAlign: "center",
                            borderRight: "2px solid black",
                        }}
                        xs={6}
                    ></Grid2>
                    <Grid2 sx={{textAlign: "center"}} xs={6}></Grid2>
                </Grid2>
            </Grid2>

        </>
    );
}

const HeaderRow = () => {
    return (
        <Grid2
            container
            rowSpacing={2}
            sx={{border: "1px solid black", marginTop: 2}}
        >
            <b style={{marginLeft: 5, paddingRight: 5, width: 45}}>Date</b>
            <Grid2
                sx={{
                    textAlign: "center",
                    borderRight: "2px solid black",
                    borderLeft: "2px solid black",
                }}
                xs={1.5}
            >
                <b>Material Received</b>
            </Grid2>
            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={1.5}
            >
                <b>Receiver</b>
            </Grid2>
            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={1.5}
            >
                <b>Destination</b>
            </Grid2>
            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={1}
            >
                <b>Ticket#</b>
            </Grid2>
            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >
                <b>Material Rate</b>
            </Grid2>
            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >
                <b>Trucking Rate</b>
            </Grid2>
            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >
                <b>Driver Rate</b>
            </Grid2>
            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >
                <b>Company Rate</b>
            </Grid2>
            <Grid2
                sx={{textAlign: "center", borderRight: "2px solid black"}}
                xs={true}
            >
                <b>Weight / Hours</b>
            </Grid2>
            <Grid2 sx={{textAlign: "center"}} xs={1.5} container>
                <Grid2 xs={12} sx={{padding: 0}}>
                    <b style={{fontSize: 17}}>Total Revenue</b>
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderRight: "2px solid black",
                        borderTop: "2px solid black",
                        padding: 0,
                    }}
                    xs={6}
                >
                    <b style={{fontSize: 12}}>Company Rev</b>
                </Grid2>
                <Grid2
                    sx={{
                        textAlign: "center",
                        borderTop: "2px solid black",
                        padding: 0,
                    }}
                    xs={6}
                >
                    <b style={{fontSize: 12}}>Trucking Rev</b>
                </Grid2>
            </Grid2>
        </Grid2>
    )
}