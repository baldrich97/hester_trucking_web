import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import AttachMoney from '@mui/icons-material/AttachMoney';
import UndoIcon from '@mui/icons-material/Undo';
import ArrowForward from '@mui/icons-material/ArrowForward';
import DoneIcon from '@mui/icons-material/Done';
import Button from "@mui/material/Button";
import Grid2 from "@mui/material/Unstable_Grid2";
import moment from "moment";
import React, {useEffect, useState} from "react";
import TextField from "@mui/material/TextField";
import {toast} from "react-toastify";
import {z} from "zod";
import {JobsModel, LoadsModel, DriversModel, DailiesModel} from "../../../prisma/zod";
import Tooltip from '@mui/material/Tooltip';
import {confirmAlert, confirmDestructive} from "../../utils/appConfirm";
import {
    buildCloseJobMessage,
    buildMarkJobPaidOutMessage,
    buildReopenJobMessage,
    buildUnmarkJobPaidOutMessage,
} from "../../utils/workflowUndo";
import {formatMaterial} from "../../utils/formatMaterial";
import {trpc} from "../../utils/trpc";
import {calendarNavButtonSx, sheetUndoButtonSx, tableTextLinkSx} from "../../theme/muiShared";
import Box from "@mui/material/Box";
import NextLink from "next/link";
import {formatDriverDisplayName} from "../../utils/entityDisplay";

type Loads = z.infer<typeof LoadsModel>;

type Driver = z.infer<typeof DriversModel>;

type Daily = z.infer<typeof DailiesModel>;

type Jobs = z.infer<typeof JobsModel>;

export type DailySheetJob = Jobs & {
    Loads?: Array<
        Loads & {
            Invoiced?: boolean | null;
            Invoices?: {Paid?: boolean | null} | null;
            Trucks?: {Notes?: string | null} | null;
        }
    >;
    Customers?: {Name?: string; ID?: number} | null;
    LoadTypes?: {Description?: string} | null;
    DeliveryLocations?: {Description?: string} | null;
    Weeklies?: {InvoiceID?: number | null} | null;
    Dailies?: unknown;
    Drivers?: {FirstName?: string; LastName?: string} | null;
};

export interface DriverSheet extends Daily {
    Drivers: Driver,
    Jobs: DailySheetJob[],
    initialExpand?: any
}

// const printDailySheet = trpc.useMutation("dailies.postPrinted", {
//     async onSuccess() {
//         toast("Successfully Generated!", { autoClose: 2000, type: "success" });
//     },
// });

const DailySheet = ({sheet, week, forceExpand, initialExpand = null, toInvoiceButton = false}: {
    sheet: DriverSheet,
    week: string,
    forceExpand: boolean,
    initialExpand: any,
    toInvoiceButton?: boolean
}) => {
    const [isOpen, setIsOpen] = useState(forceExpand);

    useEffect(() => {
        setIsOpen(initialExpand || forceExpand)
    }, [forceExpand, initialExpand])

    const [daily, setDaily] = useState<DriverSheet>(sheet);
    const [pdfDailyBusy, setPdfDailyBusy] = useState(false);

    return (
        <div style={{padding: 5}}>
            <Grid2 container columnSpacing={2}>
                <Grid2 xs={"auto"}>
                    <Button
                        variant="text"
                        type={"button"}
                        size="small"
                        sx={calendarNavButtonSx}
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
                        {formatDriverDisplayName(daily.Drivers)}
                    </b>
                </Grid2>
                <Grid2 xs={true}></Grid2>
                {daily.LastPrinted && <Grid2 xs={"auto"} sx={{display: 'grid', alignItems: 'center'}}>
                    Last Printed: {moment(daily.LastPrinted).format('MM/DD h:mm A')}
                </Grid2>}
                <Grid2 xs={"auto"} sx={{paddingRight: 2}}>
                    <Button
                        variant="contained"
                        color="warning"
                        disabled={pdfDailyBusy}
                        onClick={() => {
                            if (pdfDailyBusy) return;
                            const armCooldown = () => {
                                setPdfDailyBusy(true);
                                window.setTimeout(() => setPdfDailyBusy(false), 2000);
                            };
                            if (daily.LastPrinted) {
                                confirmAlert({
                                    customUI: ({onClose}) => {
                                        return (
                                            <div className="react-confirm-alert"
                                                 style={{width: '800px'}}> {/* Adjust width here */}
                                                <div className="react-confirm-alert-body" style={{width: '100%'}}>
                                                    <h1>Daily Sheet Print Options</h1>
                                                    <p>This Daily has already been printed. Do you want to print out
                                                        only loads created after the last print date, or print the
                                                        entire sheet?</p>
                                                    <div className="react-confirm-alert-button-group">
                                                        <button
                                                            type="button"
                                                            className="rca-btn-confirm-primary"
                                                            onClick={() => {
                                                            armCooldown();
                                                            toast("Generating PDF...", {autoClose: 2000, type: "info"});
                                                            const element = document.createElement("a");
                                                            element.href = `/api/getPDF/daily/${daily.ID}|${week}|partial`;
                                                            element.download = "daily-download.pdf";
                                                            document.body.appendChild(element);
                                                            element.click();
                                                            document.body.removeChild(element);
                                                            setDaily({...daily, LastPrinted: new Date})
                                                            onClose();
                                                        }}>New Data Only/Partial Sheet
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rca-btn-confirm-primary"
                                                            onClick={() => {
                                                                armCooldown();
                                                                toast("Generating PDF...", {
                                                                    autoClose: 2000,
                                                                    type: "info",
                                                                });
                                                                const element = document.createElement("a");
                                                                element.href = `/api/getPDF/daily/${daily.ID}|${week}|full`;
                                                                element.download = "daily-download.pdf";
                                                                document.body.appendChild(element);
                                                                element.click();
                                                                document.body.removeChild(element);
                                                                setDaily({...daily, LastPrinted: new Date});
                                                                onClose();
                                                            }}
                                                        >
                                                            All Data/Full Sheet
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rca-btn-cancel"
                                                            style={{marginLeft: "auto"}}
                                                            onClick={onClose}
                                                        >
                                                            Close
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    },
                                });
                            } else {
                                armCooldown();
                                toast("Generating PDF...", {autoClose: 2000, type: "info"});
                                const element = document.createElement("a");
                                element.href = `/api/getPDF/daily/${daily.ID}|${week}|full`;
                                element.download = "daily-download.pdf";
                                document.body.appendChild(element);
                                element.click();
                                document.body.removeChild(element);
                                setDaily({...daily, LastPrinted: new Date});
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
                {daily.Jobs?.filter((job: DailySheetJob) => (job.Loads?.length ?? 0) > 0).map(
                    (job: DailySheetJob) =>
                        <Job job={job} key={"job-" + job.ID} ownerOperator={daily.Drivers.OwnerOperator}
                             toInvoiceButton={toInvoiceButton}/>
                )}
            </div>
        </div>
    );
};

export default DailySheet;

const Job = ({job, ownerOperator, toInvoiceButton}: {
    job: DailySheetJob,
    ownerOperator: boolean,
    toInvoiceButton: boolean
}) => {
    const [jobState, setJobState] = useState<DailySheetJob>(job);

    const loads = jobState.Loads ?? [];

    let weightSum = 0;
    return (
        <div key={"job-" + job.ID}>
            {loads.sort((a, b) => a.StartDate.getTime() - b.StartDate.getTime()).map((load, index) => {
                weightSum += load.Weight ? load.Weight : load.Hours ? load.Hours : 0;
                weightSum = Math.round(weightSum * 100) / 100
                return (
                    <span key={'job-container' + load.ID}>
                           <Load load={load} job={job} index={index} key={"load-" + load.ID}/>
                        {index === loads.length - 1 &&
                            <TotalsRow job={job} index={index} load={load} weightSum={weightSum}
                                       key={"totalrow-" + job.ID} ownerOperator={ownerOperator}
                                       toInvoiceButton={toInvoiceButton}/>}
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
                       toInvoiceButton

                   }: {
    index: number,
    job: DailySheetJob,
    load: Loads,
    weightSum: number,
    ownerOperator: boolean,
    toInvoiceButton: boolean
}) => {
    const [jobState, setJobState] = useState(job);
    const [isClosed, setIsClosed] = useState(job.TruckingRevenue !== null || job.CompanyRevenue !== null);
    const [isPaidOut, setIsPaidOut] = useState(job.PaidOut)
    const revenuesLocked = isClosed || isPaidOut;


    const postJobClosed = trpc.useMutation("jobs.postClosed", {
        async onSuccess() {
            toast("Success!", {autoClose: 2000, type: "success"});
        },
        async onError(error) {
            toast(error.message, {autoClose: 10000, type: "error"});
        },
    });

    const postJobPaid = trpc.useMutation("jobs.postPaid", {
        async onSuccess() {
            toast("Success!", {autoClose: 2000, type: "success"});
        },
        async onError(error) {
            toast(error.message, {autoClose: 10000, type: "error"});
        },
    });

    const postJobReopen = trpc.useMutation("jobs.postReopen", {
        async onSuccess() {
            toast("Job reopened.", {autoClose: 2000, type: "success"});
        },
        async onError(error) {
            toast(error.message, {autoClose: 10000, type: "error"});
        },
    });

    const postJobUnpaid = trpc.useMutation("jobs.postUnpaid", {
        async onSuccess() {
            toast("Job marked unpaid.", {autoClose: 2000, type: "success"});
        },
        async onError(error) {
            toast(error.message, {autoClose: 10000, type: "error"});
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

            <b style={{width: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 4, paddingBottom: 4}}>
                {toInvoiceButton && job.Weeklies?.InvoiceID ? <Tooltip
                    title={'Go to Invoice'}>
                    <span>
                        <NextLink
                            href={{pathname: `/invoices/${job.Weeklies.InvoiceID}`}}
                            passHref
                        >
                        <a target={"_blank"}>
                            <Button
                                variant="contained"
                                color="warning"
                                aria-label="Go to invoice"
                                sx={{minWidth: 30, minHeight: 30, maxWidth: 30, maxHeight: 30}}
                            >
                        <ArrowForward/>
                    </Button>
                        </a>
                    </NextLink>

                    </span>
                </Tooltip> : <>
                    <Tooltip
                    title={
                        isPaidOut
                            ? job.PayStubID
                                ? "This job is on a paystub. Delete the paystub to mark it unpaid."
                                : "Unmark this job as paid out."
                            : isClosed
                              ? "Mark this job as paid out."
                              : "Save the revenues for this job (close it)."
                    }>
                    <span>
                        <Button
                            variant="contained"
                            aria-label={
                                isPaidOut
                                    ? job.PayStubID
                                        ? "Job is on a paystub"
                                        : "Unmark job paid out"
                                    : isClosed
                                      ? "Mark job paid out"
                                      : "Close job"
                            }
                            sx={{
                                minWidth: 30,
                                minHeight: 30,
                                maxWidth: 30,
                                maxHeight: 30,
                                bgcolor: isPaidOut
                                    ? "success.dark"
                                    : isClosed
                                      ? "success.light"
                                      : "info.main",
                                color:
                                    isPaidOut || !isClosed
                                        ? "common.white"
                                        : "text.primary",
                                "&:hover": {
                                    bgcolor: isPaidOut
                                        ? "success.main"
                                        : isClosed
                                          ? "success.main"
                                          : "info.dark",
                                },
                            }}
                            disabled={
                                Boolean(isPaidOut && job.PayStubID) ||
                                postJobPaid.isLoading ||
                                postJobClosed.isLoading ||
                                postJobUnpaid.isLoading ||
                                postJobReopen.isLoading
                            }
                            onClick={() => {
                                if (isPaidOut) {
                                    if (job.PayStubID) {
                                        return;
                                    }
                                    confirmDestructive({
                                        title: "Unmark job paid out",
                                        message: buildUnmarkJobPaidOutMessage(),
                                        confirmLabel: "Unpay",
                                        onConfirm: async () => {
                                            try {
                                                await postJobUnpaid.mutateAsync({ID: jobState.ID});
                                                setIsPaidOut(false);
                                            } catch {
                                                // onError toast already shown
                                            }
                                        },
                                    });
                                    return;
                                }
                                if (isClosed) {
                                    confirmDestructive({
                                        title: ownerOperator
                                            ? "Mark Owner Operator job paid out"
                                            : "Mark W2 job paid out",
                                        message: buildMarkJobPaidOutMessage(),
                                        confirmLabel: "Yes",
                                        cancelLabel: "No",
                                        onConfirm: async () => {
                                            try {
                                                await postJobPaid.mutateAsync({
                                                    ...jobState,
                                                    PaidOut: true,
                                                });
                                                setIsPaidOut(true);
                                            } catch {
                                                // onError toast already shown
                                            }
                                        },
                                    });
                                } else {
                                    confirmDestructive({
                                        title: "Close job",
                                        message: buildCloseJobMessage(),
                                        confirmLabel: "Yes",
                                        cancelLabel: "No",
                                        onConfirm: async () => {
                                            try {
                                                const data = await postJobClosed.mutateAsync({
                                                    ...jobState,
                                                    TruckingRevenue: jobState.TruckingRevenue
                                                        ? jobState.TruckingRevenue
                                                        : Math.round(
                                                              weightSum *
                                                                  (load.DriverRate !== load.TruckRate
                                                                      ? load.DriverRate ?? 0
                                                                      : load.TruckRate ?? 0) *
                                                                  100,
                                                          ) / 100,
                                                    CompanyRevenue: jobState.CompanyRevenue
                                                        ? jobState.CompanyRevenue
                                                        : Math.round(
                                                              weightSum * (load.TotalRate ? load.TotalRate : 0) * 100,
                                                          ) / 100,
                                                });
                                                setJobState((prevState) => ({
                                                    ...prevState,
                                                    ...data,
                                                }));
                                                setIsClosed(true);
                                            } catch {
                                                // onError toast already shown
                                            }
                                        },
                                    });
                                }
                            }}
                        >
                        {isPaidOut || isClosed ? <AttachMoney/> : <DoneIcon/>}
                    </Button>
                    </span>
                </Tooltip>
                {isClosed && !isPaidOut ? (
                    <Tooltip title="Reopen this job so matching loads can join it again (weekly must also be open).">
                        <span>
                            <Button
                                variant="contained"
                                aria-label="Reopen job"
                                sx={sheetUndoButtonSx}
                                disabled={postJobReopen.isLoading}
                                onClick={() => {
                                    confirmDestructive({
                                        title: "Reopen job",
                                        message: buildReopenJobMessage(),
                                        confirmLabel: "Reopen",
                                        onConfirm: async () => {
                                            try {
                                                const data = await postJobReopen.mutateAsync({ID: jobState.ID});
                                                setJobState((prevState) => ({
                                                    ...prevState,
                                                    ...data,
                                                }));
                                                setIsClosed(false);
                                            } catch {
                                                // onError toast already shown
                                            }
                                        },
                                    });
                                }}
                            >
                                <UndoIcon fontSize="small"/>
                            </Button>
                        </span>
                    </Tooltip>
                ) : null}
                </>}
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
                        disabled={revenuesLocked}
                        value={jobState.CompanyRevenue ? parseFloat(jobState.CompanyRevenue.toString()) : (Math.round(weightSum * (load.TotalRate ? load.TotalRate : 0) * 100) / 100)}
                        onChange={(e) => {
                            if (revenuesLocked) {
                                return;
                            }
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
                        disabled={revenuesLocked}
                        value={jobState.TruckingRevenue ? parseFloat(jobState.TruckingRevenue.toString()) : (Math.round(weightSum * (load.DriverRate != load.TruckRate ? load.DriverRate ?? 0 : load.TruckRate ?? 0) * 100) / 100)}
                        onChange={(e) => {
                            if (revenuesLocked) {
                                return;
                            }
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

const Load = ({load, index, job}: { load: Loads, index: number, job: DailySheetJob }) => {
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
                        ? formatMaterial({
                            description: job.LoadTypes?.Description,
                            source: (job as {Sources?: {Name?: string; ShortName?: string}}).Sources,
                        })
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
                    <Box
                        component="a"
                        href={`/loads/${load.ID}`}
                        target="_blank"
                        rel="noreferrer"
                        sx={{...tableTextLinkSx, fontWeight: "bold"}}
                    >
                        {load.TicketNumber ?? "N/A"}
                    </Box>
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