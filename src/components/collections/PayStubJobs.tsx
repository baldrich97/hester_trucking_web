import * as React from "react";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Checkbox from "@mui/material/Checkbox";
import { visuallyHidden } from "@mui/utils";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

interface Data {
    "ID": number,
    "DateRange": string,
    "Loads": any,
    "DeliveryLocations": any,
    "LoadTypes": any,
    "Customers": any,
    "TruckingRate": number,
    "DriverRate": number,
    "Weight": number,
    "Hours": number,
    "TruckingRevenue": number,
    "DescriptionLabel": string
}

function descendingComparator<T>(a: any, b: any) {
    const descA = a.LoadTypes?.StartDate ?? '';
    const descB = b.LoadTypes?.StartDate ?? '';

    if (descB < descA) {
        return -1;
    }
    if (descB > descA) {
        return 1;
    }
    return 0;
}

type Order = "asc" | "desc";

function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key
): (
    a: { [key in Key]: number | string },
    b: { [key in Key]: number | string }
) => number {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b)
        : (a, b) => -descendingComparator(a, b);
}

interface HeadCell {
    disablePadding: boolean;
    id: keyof Data;
    label: string;
    numeric: boolean;
}

const headCells: readonly HeadCell[] = [
    {
        id: "DateRange",
        numeric: false,
        disablePadding: true,
        label: "Date",
    },
    {
        id: "DescriptionLabel",
        numeric: false,
        disablePadding: false,
        label: "Description",
    },
    {
        id: "Weight",
        numeric: false,
        disablePadding: true,
        label: "Tons",
    },
    {
        id: "TruckingRate",
        numeric: false,
        disablePadding: true,
        label: "Rate",
    },
    {
        id: 'TruckingRevenue',
        numeric: false,
        disablePadding: true,
        label: 'Amount',
    },
];

interface EnhancedTableProps {
    numSelected: number;
    onRequestSort: (
        event: React.MouseEvent<unknown>,
        property: keyof Data
    ) => void;
    onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
    order: Order;
    orderBy: string;
    rowCount: number;
    readOnly: boolean;
}

function EnhancedTableHead(props: EnhancedTableProps) {
    const {
        onSelectAllClick,
        order,
        orderBy,
        numSelected,
        rowCount,
        onRequestSort,
        readOnly,
    } = props;
    const createSortHandler =
        (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
            onRequestSort(event, property);
        };

    return (
        <TableHead>
            <TableRow>
                {!readOnly && (
                    <TableCell padding="checkbox" size={"small"}>
                        <Checkbox
                            color="primary"
                            indeterminate={numSelected > 0 && numSelected < rowCount}
                            checked={rowCount > 0 && numSelected === rowCount}
                            onChange={onSelectAllClick}
                            inputProps={{
                                "aria-label": "select all loads",
                            }}
                        />
                    </TableCell>
                )}
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={"center"}
                        padding={"none"}
                        sortDirection={false}
                        size={"small"}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : "asc"}
                            onClick={() => {
                                //not empty
                            }}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component="span" sx={visuallyHidden}>
                                    {order === "desc" ? "sorted descending" : "sorted ascending"}
                                </Box>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

interface EnhancedTableToolbarProps {
    numSelected: number;
    readOnly: boolean;
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
    const { numSelected, readOnly } = props;

    return (
        <Toolbar
            sx={{
                pl: { sm: 2 },
                pr: { xs: 1, sm: 1 },
                ...(numSelected > 0 && {
                    bgcolor: (theme) =>
                        alpha(
                            theme.palette.primary.main,
                            theme.palette.action.activatedOpacity
                        ),
                }),
            }}
        >
            {numSelected > 0 ? (
                <Typography
                    sx={{ flex: "1 1 100%" }}
                    color="inherit"
                    variant="subtitle1"
                    component="div"
                >
                    {numSelected} selected
                </Typography>
            ) : (
                <Typography
                    sx={{ flex: "1 1 100%" }}
                    variant="h6"
                    id="tableTitle"
                    component="div"
                >
                    Jobs {readOnly ? "Included" : "Available"}
                </Typography>
            )}
        </Toolbar>
    );
}

function formatDateRange(loads: any) {
    if (loads.length === 0) return null;

    // Sort the loads by StartDate to get the earliest and latest
    const dates = loads
        .map((load: { StartDate: string | number | Date; }) => new Date(load.StartDate))
        .sort((a: { getTime: () => number; }, b: { getTime: () => number; }) => a.getTime() - b.getTime());

    const earliest = dates[0];
    const latest = dates[dates.length - 1];

    // Check if both dates are the same
    if (earliest.getTime() === latest.getTime()) {
        return `${earliest.getUTCMonth() + 1}/${earliest.getUTCDate()}`; // Format as "2/13"
    }

    // Check if both dates are in the same month
    if (earliest.getUTCMonth() === latest.getUTCMonth() && earliest.getUTCFullYear() === latest.getUTCFullYear()) {
        return `${earliest.getUTCMonth() + 1}(${earliest.getUTCDate()}-${latest.getUTCDate()})`; // Format as "2(13-27)"
    }

    // Otherwise, format as "2/21-3/1"
    return `${earliest.getUTCMonth() + 1}/${earliest.getUTCDate()}-${latest.getUTCMonth() + 1}/${latest.getUTCDate()}`;
}


function sumLoads(loads: { Hours?: number; Weight?: number }[]): number {
    return loads.reduce((total, load) => {
        if (load.Hours) {
            return total + load.Hours;
        } else if (load.Weight) {
            return total + load.Weight;
        }
        return total;
    }, 0);
}

function calculateRevenue(row: {
    TruckingRate: number;
    DriverRate?: number;
    TruckingRevenue?: number;
    Loads: { Hours?: number; Weight?: number }[];
}): number {
    if (row.TruckingRevenue) {
        return row.TruckingRevenue
    }
    const totalLoadValue = sumLoads(row.Loads);
    const rate = row.DriverRate && row.DriverRate !== row.TruckingRate
        ? row.DriverRate
        : row.TruckingRate;

    return totalLoadValue * rate;
}



function Row(props: {
    readOnly: boolean;
    row: ReturnType<any>;
    labelId: string;
    isItemSelected: boolean;
    handleClick: any;
}) {
    const { readOnly, row, labelId, isItemSelected, handleClick } = props;
    const [open, setOpen] = React.useState(false);

    return (
        <React.Fragment>
            <TableRow
                hover
                role="checkbox"
                aria-checked={isItemSelected}
                tabIndex={-1}
                key={Math.random().toString()}
                selected={isItemSelected}
            >
                {!readOnly && (
                    <TableCell padding="checkbox" size={"small"}>
                        <Checkbox
                            color="primary"
                            checked={isItemSelected}
                            inputProps={{
                                "aria-labelledby": labelId,
                            }}
                            onClick={(event) =>
                                handleClick(event, row.ID.toString(), Math.round((calculateRevenue(row) + Number.EPSILON) * 100) / 100)
                            }
                        />
                    </TableCell>
                )}
                <TableCell
                    component="th"
                    id={labelId}
                    scope="row"
                    padding={"none"}
                    size={"small"}
                    align={"center"}
                >
                    {formatDateRange(row.Loads ? row.Loads : [])}
                </TableCell>
                <TableCell align="center" padding="none" size={"small"}>
                    {((row.LoadTypes?.Description ?? 'MISSING') + ' ' + (row.Customers?.Name ?? 'MISSING') + ' ' + (row.DeliveryLocations?.Description ?? 'MISSING'))}
                </TableCell>
                <TableCell align="center" padding="none" size={"small"}>
                    {Math.round((sumLoads(row.Loads ? row.Loads : []) + Number.EPSILON) * 100) / 100}
                </TableCell>
                <TableCell align="center" padding="none" size={"small"}>
                    {Math.round((parseFloat((row.DriverRate && row.DriverRate !== row.TruckingRate) ? row.DriverRate : row.TruckingRate) + Number.EPSILON) * 100) /
                        100}
                </TableCell>
                <TableCell align="center" padding="none" size={"small"}>
                    {Math.round((calculateRevenue(row) + Number.EPSILON) * 100) / 100}
                </TableCell>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                                Details
                            </Typography>
                            <Table size="small" aria-label="purchases">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="left" padding="none" size={"small"}>
                                            Date Delivered
                                        </TableCell>
                                        <TableCell align="left" padding="none" size={"small"}>
                                            Ticket Number
                                        </TableCell>
                                        <TableCell align="left" padding="none" size={"small"}>
                                            Notes
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {row.Loads?.map((load: { ID: { toString: () => string; }; StartDate: string | number | Date; TicketNumber: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactFragment | React.ReactPortal | null | undefined; Notes: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactFragment | React.ReactPortal | null | undefined; }) =>
                                        <TableRow key={"inner_row_" + load.ID.toString()}>
                                            <TableCell align="left" padding="none" size={"small"}>
                                                {new Date(load.StartDate).toLocaleDateString("en-US", {
                                                    timeZone: "UTC",
                                                })}
                                            </TableCell>
                                            <TableCell align="left" padding="none" size={"small"}>
                                                {load.TicketNumber}
                                            </TableCell>
                                            <TableCell align="left" padding="none" size={"small"}>
                                                {load.Notes ? load.Notes : "N/A"}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

export default function PayStubJobs({
                                         readOnly,
                                         rows,
                                         updateTotal,
                                         updateSelected
                                     }: {
    readOnly: boolean;
    rows: any[];
    updateTotal: any;
    updateSelected: any;

}) {
    const [order, setOrder] = React.useState<Order>("asc");
    const [orderBy, setOrderBy] = React.useState<keyof Data>("DeliveryLocations");
    const [selected, setSelected] = React.useState<readonly string[]>([]);
    const [total, setTotal] = React.useState<number>(0);

    React.useEffect(() => {
        setSelected([]);
        setTotal(0);
    }, [rows]);

    const handleRequestSort = (
        event: React.MouseEvent<unknown>,
        property: keyof Data
    ) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            let newTotal = 0;
            const newSelected = rows.map((n) => {
                newTotal += (Math.round((calculateRevenue(n) + Number.EPSILON) * 100) / 100);
                return n.ID.toString();
            });
            setSelected(newSelected);
            setTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
            updateTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
            updateSelected(newSelected);
            return;
        }
        setSelected([]);
        setTotal(0);
        updateTotal(0);
        updateSelected([]);
    };

    const handleClick = (
        event: React.MouseEvent<unknown>,
        ID: string,
        TotalAmount: number
    ) => {
        //TODO FIX THIS
        const selectedIndex = selected.indexOf(ID);
        let newSelected: readonly string[] = [];
        let newTotal = 0;

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, ID);
            newTotal = total + TotalAmount;
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
            newTotal = total - TotalAmount;
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
            newTotal = total - TotalAmount;
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
            newTotal = total - TotalAmount;
        }
        setTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
        setSelected(newSelected);
        updateTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
        updateSelected(newSelected);
    };

    const isSelected = (ID: string) => selected.indexOf(ID) !== -1;

    return (
        <Box sx={{ width: "100%" }}>
            <Paper sx={{ width: "100%", mb: 2 }}>
                <EnhancedTableToolbar
                    numSelected={selected.length}
                    readOnly={readOnly}
                />
                <TableContainer>
                    <Table
                        aria-labelledby="tableTitle"
                        size={"small"}
                        //sx={{minWidth: 750}}
                    >
                        <EnhancedTableHead
                            numSelected={selected.length}
                            order={order}
                            orderBy={orderBy}
                            onSelectAllClick={handleSelectAllClick}
                            onRequestSort={handleRequestSort}
                            rowCount={rows.length}
                            readOnly={readOnly}
                        />
                        <TableBody>
                            {rows.sort(getComparator(order, orderBy)).map((row, index) => {
                                const isItemSelected = isSelected(row.ID.toString());
                                const labelId = `enhanced-table-checkbox-${index}`;

                                return (
                                    <Row
                                        key={row.ID.toString()}
                                        readOnly={readOnly}
                                        row={row}
                                        isItemSelected={isItemSelected}
                                        labelId={labelId}
                                        handleClick={handleClick}
                                    />
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
