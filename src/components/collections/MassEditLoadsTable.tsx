import * as React from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CloseIcon from "@mui/icons-material/Close";
import Paper from "@mui/material/Paper";
import TableEntityLink from "../../elements/TableEntityLink";
import {formatDriverDisplayName, formatTruckDisplayName} from "../../utils/entityDisplay";
import {formatMaterialFromLoad} from "../../utils/formatMaterial";

export type MassEditLoadRow = {
    ID: number;
    TicketNumber: number;
    StartDate?: string | Date | null;
    TotalRate?: number | null;
    TotalAmount?: number | null;
    Weight?: number | null;
    MaterialRate?: number | null;
    TruckRate?: number | null;
    DriverRate?: number | null;
    Notes?: string | null;
    Customers?: {Name?: string | null} | null;
    LoadTypes?: {Description?: string | null} | null;
    DeliveryLocations?: {Description?: string | null} | null;
    Trucks?: {Name?: string | null; Notes?: string | null} | null;
    Drivers?: {FirstName?: string | null; LastName?: string | null} | null;
    Sources?: {Name?: string | null; ShortName?: string | null} | null;
};

function formatDate(value: string | Date | null | undefined): string {
    if (!value) {
        return "N/A";
    }
    return new Date(value).toLocaleDateString("en-US", {timeZone: "UTC"});
}

function MassEditLoadRowDetail({row}: {row: MassEditLoadRow & {onRemove?: () => void}}) {
    const [open, setOpen] = React.useState(false);

    return (
        <React.Fragment>
            <TableRow hover data-testid={`mass-edit-load-row-${row.ID}`}>
                <TableCell padding="none" size="small">
                    <IconButton
                        aria-label="remove load from mass edit"
                        size="small"
                        data-testid={`mass-edit-remove-${row.ID}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            row.onRemove?.();
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </TableCell>
                <TableCell size="small">{row.TicketNumber}</TableCell>
                <TableCell size="small">{formatDate(row.StartDate)}</TableCell>
                <TableCell size="small">{row.Customers?.Name ?? "—"}</TableCell>
                <TableCell size="small">{row.LoadTypes?.Description ?? "—"}</TableCell>
                <TableCell size="small">{formatTruckDisplayName(row.Trucks)}</TableCell>
                <TableCell size="small" align="right">
                    {row.Weight != null ? Math.round(row.Weight * 100) / 100 : "—"}
                </TableCell>
                <TableCell size="small" align="right">
                    {row.TotalRate != null
                        ? Math.round((row.TotalRate + Number.EPSILON) * 100) / 100
                        : "—"}
                </TableCell>
                <TableCell size="small" align="right">
                    {row.TotalAmount != null
                        ? Math.round((row.TotalAmount + Number.EPSILON) * 100) / 100
                        : "—"}
                </TableCell>
                <TableCell size="small">
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        data-testid={`mass-edit-expand-${row.ID}`}
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{paddingBottom: 0, paddingTop: 0}} colSpan={10}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{margin: 1}} data-testid={`mass-edit-detail-${row.ID}`}>
                            <Typography variant="subtitle2" gutterBottom>
                                Load details
                            </Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Driver</TableCell>
                                        <TableCell>{formatDriverDisplayName(row.Drivers)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Truck</TableCell>
                                        <TableCell>{formatTruckDisplayName(row.Trucks)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Material</TableCell>
                                        <TableCell>{formatMaterialFromLoad(row)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Delivery</TableCell>
                                        <TableCell>{row.DeliveryLocations?.Description ?? "N/A"}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Rates (M / T / D / Co)</TableCell>
                                        <TableCell>
                                            {[row.MaterialRate, row.TruckRate, row.DriverRate, row.TotalRate]
                                                .map((r) =>
                                                    r != null
                                                        ? Math.round((r + Number.EPSILON) * 100) / 100
                                                        : "—",
                                                )
                                                .join(" / ")}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Notes</TableCell>
                                        <TableCell>{row.Notes ?? "N/A"}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Open</TableCell>
                                        <TableCell>
                                            <TableEntityLink href={`/loads/${row.ID}`}>
                                                View load
                                            </TableEntityLink>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

type MassEditLoadsTableProps = {
    jobId: number;
    loads: MassEditLoadRow[];
    onRemove: (loadId: number) => void;
};

export default function MassEditLoadsTable({jobId, loads, onRemove}: MassEditLoadsTableProps) {
    const rows = loads.map((load) => ({
        ...load,
        onRemove: () => onRemove(load.ID),
    })) as Array<MassEditLoadRow & {onRemove?: () => void}>;

    return (
        <Paper sx={{width: "100%"}} data-testid="mass-edit-loads-table">
            <Typography variant="h6" sx={{p: 1.5, pb: 0}} data-testid="mass-edit-job-header">
                Job #{jobId} — {loads.length} load{loads.length === 1 ? "" : "s"} selected
            </Typography>
            <TableContainer sx={{maxHeight: "calc(100vh - 220px)"}} data-testid="mass-edit-table-scroll">
                <Table stickyHeader size="small" aria-label="mass edit loads">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="none" />
                            <TableCell>Ticket #</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Load Type</TableCell>
                            <TableCell>Truck</TableCell>
                            <TableCell align="right">Weight</TableCell>
                            <TableCell align="right">Rate</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <MassEditLoadRowDetail key={row.ID} row={row} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
