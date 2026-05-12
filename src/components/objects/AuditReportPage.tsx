import React, {useMemo, useState} from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid2 from "@mui/material/Unstable_Grid2";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import BasicAutocomplete from "../../elements/Autocomplete";
import {trpc} from "../../utils/trpc";
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import GenericTable from "../../elements/GenericTable";
import {toast} from "react-toastify";

type Mode = "source" | "customer";

type ReportRow = {
    ID: number;
    StartDate: Date;
    TicketNumber: number;
    Weight: number;
    TotalAmount: number;
    TotalRate: number;
    MaterialRate: number;
    TruckRate: number;
    DriverRate: number;
    LoadType: string;
    Customer: string;
    DeliveryLocation: string;
};

type ReportSummaryRow = {
    loadType: string;
    totalLoads: number;
    totalTonnage: number;
    totalAmount: number;
};

type ReportPayload = {
    source?: {ID: number; Name: string} | null;
    customer?: {ID: number; Name: string} | null;
    rows: ReportRow[];
    summary: {
        totalLoads: number;
        totalTonnage: number;
        totalAmount: number;
        byLoadType: ReportSummaryRow[];
    };
};

const reportColumns: TableColumnsType = [
    {name: "StartDate", as: "Date"},
    {name: "TicketNumber", as: "Ticket #"},
    {name: "LoadType", as: "Load Type"},
    {name: "Weight", as: "Tonnage"},
    {name: "TotalRate", as: "Rate"},
    {name: "TotalAmount", as: "Amount"},
    {name: "Customer", as: "Customer"},
    {name: "DeliveryLocation", as: "To / Delivery"},
];

const reportOverrides: TableColumnOverridesType = [{name: "StartDate", type: "date"}];

function formatDateInput(date: Date): string {
    return date.toISOString().split("T")[0] ?? "";
}

function getMonthRange(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {start, end};
}

function getQuarterRange(date: Date) {
    const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
    const start = new Date(date.getFullYear(), quarterStartMonth, 1);
    const end = new Date(date.getFullYear(), quarterStartMonth + 3, 0);
    return {start, end};
}

function getYearRange(date: Date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);
    return {start, end};
}

function formatCurrency(value: number): string {
    return `$${(Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)}`;
}

const AuditReportPage = ({mode}: {mode: Mode}) => {
    const now = useMemo(() => new Date(), []);
    const defaultRange = getMonthRange(now);
    const [entityId, setEntityId] = useState(0);
    const [startDate, setStartDate] = useState(formatDateInput(defaultRange.start));
    const [endDate, setEndDate] = useState(formatDateInput(defaultRange.end));
    const [shouldRun, setShouldRun] = useState(false);
    const [report, setReport] = useState<ReportPayload | null>(null);

    const queryKey = mode === "source"
        ? ["reports.sourceAudit", {sourceId: entityId, startDate: new Date(startDate), endDate: new Date(endDate)}]
        : ["reports.customerAudit", {customerId: entityId, startDate: new Date(startDate), endDate: new Date(endDate)}];

    trpc.useQuery(queryKey as any, {
        enabled: shouldRun && entityId > 0,
        refetchOnWindowFocus: false,
        onSuccess(data) {
            setReport(data as ReportPayload);
            setShouldRun(false);
        },
        onError(error) {
            toast(error.message, {autoClose: 3000, type: "error"});
            setShouldRun(false);
        },
    });

    const runReport = () => {
        if (!entityId) {
            toast(`Please select a ${mode} first.`, {autoClose: 2000, type: "warning"});
            return;
        }
        if (!startDate || !endDate) {
            toast("Please provide both start and end dates.", {autoClose: 2000, type: "warning"});
            return;
        }
        setShouldRun(true);
    };

    const applyPreset = (preset: "month" | "quarter" | "year") => {
        const base = new Date();
        const range = preset === "month" ? getMonthRange(base) : preset === "quarter" ? getQuarterRange(base) : getYearRange(base);
        setStartDate(formatDateInput(range.start));
        setEndDate(formatDateInput(range.end));
    };

    const downloadPdf = () => {
        if (!report) {
            toast("Run a report first.", {autoClose: 2000, type: "warning"});
            return;
        }
        const name = mode === "source" ? report.source?.Name : report.customer?.Name;
        toast("Generating PDF...", {autoClose: 2000, type: "info"});
        const element = document.createElement("a");
        element.href =
            mode === "source"
                ? `/api/getPDF/report/${entityId}|${encodeURIComponent(startDate)}|${encodeURIComponent(endDate)}`
                : `/api/getPDF/reportCustomer/${entityId}|${encodeURIComponent(startDate)}|${encodeURIComponent(endDate)}`;
        element.download = `${mode}-report-${(name ?? "unknown").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${startDate}-to-${endDate}.pdf`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const displayRows = useMemo(
        () =>
            (report?.rows ?? []).map((row) => ({
                ...row,
                TotalRate: formatCurrency(row.TotalRate),
                TotalAmount: formatCurrency(row.TotalAmount),
            })),
        [report],
    );

    const entityName = mode === "source" ? report?.source?.Name : report?.customer?.Name;
    const entityLabel = mode === "source" ? "Source" : "Customer";
    const autoLabel = mode === "source" ? "Source" : "Customer";
    const autoQuery = mode === "source" ? "sources" : "customers";
    const autoOptionLabel = mode === "source" ? "Name" : "Name+|+Street+,+City";

    return (
        <Box>
            <Typography variant="h5" sx={{mb: 1}}>Reports</Typography>
            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                Audit by {mode} over a calendar month, quarter, year, or custom date range.
            </Typography>
            <Grid2 container spacing={2} sx={{mb: 2}}>
                <Grid2 xs={12} md={4}>
                    <BasicAutocomplete
                        label={autoLabel}
                        optionLabel={autoOptionLabel}
                        optionValue="ID"
                        searchQuery={autoQuery}
                        defaultValue={null}
                        onSelect={(value: number) => setEntityId(value)}
                    />
                </Grid2>
                <Grid2 xs={12} md={2}>
                    <TextField label="Start Date" type="date" size="small" fullWidth InputLabelProps={{shrink: true}} value={startDate} onChange={(e) => setStartDate(e.currentTarget.value)} />
                </Grid2>
                <Grid2 xs={12} md={2}>
                    <TextField label="End Date" type="date" size="small" fullWidth InputLabelProps={{shrink: true}} value={endDate} onChange={(e) => setEndDate(e.currentTarget.value)} />
                </Grid2>
                <Grid2 xs={12} md={4} sx={{display: "flex", gap: 1}}>
                    <Button variant="outlined" onClick={() => applyPreset("month")}>Month</Button>
                    <Button variant="outlined" onClick={() => applyPreset("quarter")}>Quarter</Button>
                    <Button variant="outlined" onClick={() => applyPreset("year")}>Year</Button>
                    <Button variant="contained" onClick={runReport}>Run Report</Button>
                    <Button variant="outlined" onClick={downloadPdf} disabled={!report}>Download PDF</Button>
                </Grid2>
            </Grid2>

            {report ? (
                <>
                    <Typography variant="h6" sx={{mb: 1}}>{entityLabel}: {entityName ?? "Unknown"}</Typography>
                    <Grid2 container spacing={2}>
                        <Grid2 xs={12} md={4}><Box sx={{p: 2, border: "1px solid #ddd", borderRadius: 1}}><Typography variant="subtitle2">Total Loads</Typography><Typography variant="h6">{report.summary.totalLoads}</Typography></Box></Grid2>
                        <Grid2 xs={12} md={4}><Box sx={{p: 2, border: "1px solid #ddd", borderRadius: 1}}><Typography variant="subtitle2">Total Tonnage</Typography><Typography variant="h6">{Math.round((report.summary.totalTonnage + Number.EPSILON) * 100) / 100}</Typography></Box></Grid2>
                        <Grid2 xs={12} md={4}><Box sx={{p: 2, border: "1px solid #ddd", borderRadius: 1}}><Typography variant="subtitle2">Total Amount</Typography><Typography variant="h6">{formatCurrency(report.summary.totalAmount)}</Typography></Box></Grid2>
                    </Grid2>
                    <Divider sx={{my: 2}} />
                    <Typography variant="h6" sx={{mb: 1}}>Subtotals by Load Type</Typography>
                    <Table size="small" sx={{mb: 2}}>
                        <TableHead><TableRow><TableCell>Load Type</TableCell><TableCell align="right">Loads</TableCell><TableCell align="right">Tonnage</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
                        <TableBody>
                            {report.summary.byLoadType.length === 0 ? (
                                <TableRow><TableCell colSpan={4}>No rows found for this filter.</TableCell></TableRow>
                            ) : (
                                report.summary.byLoadType.map((row) => (
                                    <TableRow key={`summary-${row.loadType}`}>
                                        <TableCell>{row.loadType}</TableCell>
                                        <TableCell align="right">{row.totalLoads}</TableCell>
                                        <TableCell align="right">{Math.round((row.totalTonnage + Number.EPSILON) * 100) / 100}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.totalAmount)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Typography variant="h6" sx={{mb: 1}}>Detailed Rows</Typography>
                    <GenericTable data={displayRows} columns={reportColumns} overrides={reportOverrides} count={displayRows.length} />
                </>
            ) : (
                <Typography variant="body2" color="text.secondary">Run a report to view totals and detailed load rows.</Typography>
            )}
        </Box>
    );
};

export default AuditReportPage;
