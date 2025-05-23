import * as React from "react";
import {alpha} from "@mui/material/styles";
import Box from "@mui/material/Box";
import CloseIcon from '@mui/icons-material/Close';
import Modal from '@mui/material/Modal';
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
import {visuallyHidden} from "@mui/utils";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
    CompleteCustomers,
    CompleteDeliveryLocations,
    CompleteJobs,
    CompleteLoadTypes,
    CompleteWeeklies
} from "../../../prisma/zod";
import Button from "@mui/material/Button";
import NextLink from "next/link";
import PayStub from "../objects/PayStub";

interface CustomerSheet extends CompleteWeeklies {
    Customers: CompleteCustomers,
    Jobs: CompleteJobs[],
    DeliveryLocations: CompleteDeliveryLocations,
    LoadTypes: CompleteLoadTypes
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
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
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

interface HeadCell {
    disablePadding: boolean;
    id: keyof CustomerSheet;
    label: string;
    numeric: boolean;
}

const headCells: readonly HeadCell[] = [
    {
        id: "LoadTypeID",
        numeric: false,
        disablePadding: true,
        label: "Load Type",
    },
    {
        id: "DeliveryLocationID",
        numeric: false,
        disablePadding: false,
        label: "Location",
    },
    {
        id: "Revenue",
        numeric: false,
        disablePadding: true,
        label: "T. Rev",
    }
];

interface EnhancedTableProps {
    numSelected: number;
    onRequestSort: (
        event: React.MouseEvent<unknown>,
        property: keyof CustomerSheet
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
        (property: keyof CustomerSheet) => (event: React.MouseEvent<unknown>) => {
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
                                "aria-label": "select all weeklies",
                            }}
                        />
                    </TableCell>
                )}
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? "right" : "left"}
                        padding={headCell.disablePadding && !readOnly ? "none" : "normal"}
                        sortDirection={orderBy === headCell.id ? order : false}
                        size={"small"}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : "asc"}
                            onClick={createSortHandler(headCell.id)}
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
    const {numSelected, readOnly} = props;

    return (
        <Toolbar
            sx={{
                pl: {sm: 2},
                pr: {xs: 1, sm: 1},
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
                    sx={{flex: "1 1 100%"}}
                    color="inherit"
                    variant="subtitle1"
                    component="div"
                >
                    {numSelected} selected
                </Typography>
            ) : (
                <Typography
                    sx={{flex: "1 1 100%"}}
                    variant="h6"
                    id="tableTitle"
                    component="div"
                >
                    Weeklies {readOnly ? "Included" : "Available"}
                </Typography>
            )}
        </Toolbar>
    );
}

function Row(props: {
    readOnly: boolean;
    row: CompleteWeeklies;
    labelId: string;
    isItemSelected: boolean;
    handleClick: any;
    redBackground?: boolean | null;
    setInitialJob?: any;
    setShowPayModal?: any;
}) {
    const {readOnly, row, labelId, isItemSelected, handleClick, redBackground, setInitialJob, setShowPayModal} = props;
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
                sx={{backgroundColor: readOnly && redBackground !== null ? redBackground ? "#ff6161" : "#3acf00" : "#F5F5F5"}}
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
                                handleClick(event, row.ID.toString(), row.Revenue)
                            }
                        />
                    </TableCell>
                )}
                <TableCell
                    component="th"
                    id={labelId}
                    scope="row"
                    padding={!readOnly ? "none" : "normal"}
                    size={"small"}
                >
                    {row.LoadTypes.Description}
                </TableCell>
                <TableCell align="left" padding="normal" size={"small"}>
                    {row.DeliveryLocations.Description}
                </TableCell>
                <TableCell align="left" padding="normal" size={"small"}>
                    {Math.round((row.Revenue ?? Number.EPSILON) * 100) / 100}
                </TableCell>
                <TableCell align="right" padding="none" size={"small"}>
                    <NextLink
                        href={{pathname: "/weeklies", query: {forceExpand: row.ID, defaultWeek: row.Week}}}
                        passHref
                    >
                        <a target={"_blank"}>
                            <Button color={"primary"} variant={"contained"} style={{backgroundColor: '#1976d2'}}>
                                To Weekly
                            </Button>
                        </a>
                    </NextLink>
                </TableCell>
                <TableCell align={'right'} padding="none" size={"small"}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon/>}
                    </IconButton>
                </TableCell>
            </TableRow>
            {row.Jobs.map((job) => {
                if (job.Loads.length === 0 || !job.Loads) {
                    return null;
                }
                job.Loads.sort((a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime())
                return (
                    <>
                        <TableRow key={Math.random()} style={{display: open ? 'table-row' : 'none'}}>
                            <TableCell style={{paddingBottom: 0, paddingTop: 0}} colSpan={5}>
                                <Collapse in={open} timeout="auto" unmountOnExit>
                                    <Box sx={{margin: 1}}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            backgroundColor: job.PaidOut ? "#88ff83" : (job.TruckingRevenue !== null || job.CompanyRevenue !== null) ? "#8991ff" : "#bababa"
                                        }}>
                                            <Typography variant="h6" gutterBottom component="div">
                                                Job Details
                                            </Typography>
                                            <TableCell align="right" padding="none" size={"small"}>
                                                {!job.PaidOut && job.Drivers?.OwnerOperator && redBackground && <Button
                                                    color={"primary"}
                                                    variant={"contained"}
                                                    style={{backgroundColor: '#1976d2'}}
                                                    onClick={() => {
                                                        setInitialJob(job)
                                                        setShowPayModal(true)
                                                    }}
                                                >
                                                    New Paystub
                                                </Button>}
                                                <NextLink
                                                    href={{
                                                        pathname: "/dailies",
                                                        query: {forceExpand: job.DriverID, defaultWeek: row.Week}
                                                    }}
                                                    passHref
                                                >
                                                    <a target={"_blank"}>
                                                        <Button color={"primary"} variant={"contained"}
                                                                style={{backgroundColor: '#00dfff'}}>
                                                            To Daily
                                                        </Button>
                                                    </a>
                                                </NextLink>
                                            </TableCell>
                                        </div>
                                        <Table size="small" aria-label="purchases">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell align="left" padding="none" size={"small"}
                                                               sx={{width: "50%"}}>
                                                        {job.Drivers.FirstName + ' ' + job.Drivers.LastName}
                                                    </TableCell>
                                                    <TableCell align="left" padding="none" size={"small"}
                                                               sx={{width: "33%"}}>
                                                        Truck Driven
                                                    </TableCell>
                                                    <TableCell align="left" padding="none" size={"small"}
                                                               sx={{width: "33%"}}>
                                                        Weight/Hours
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {job.Loads.map((load) =>
                                                    <TableRow key={"inner_row_" + load.ID.toString()}>
                                                        <TableCell align="left" padding="normal" size={"small"}>
                                                            {load.StartDate
                                                                ? new Date(load.StartDate).toLocaleDateString("en-US", {
                                                                    timeZone: "UTC",
                                                                })
                                                                : "N/A"}
                                                        </TableCell>
                                                        <TableCell align="left" padding="none" size={"small"}>
                                                            {load.Trucks ? load.Trucks?.Name : "N/A"}
                                                        </TableCell>
                                                        <TableCell align="left" padding="normal" size={"small"}>
                                                            {Math.round((load.Weight ? load.Weight : load.Hours ? load.Hours : 0) * 100) / 100}
                                                        </TableCell>
                                                    </TableRow>)}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Collapse>
                            </TableCell>
                        </TableRow>
                    </>
                )
            })}
        </React.Fragment>
    );
}

export default function InvoiceWeeklies({
                                            readOnly,
                                            rows,
                                            updateTotal,
                                            updateSelected,
                                            isPaid
                                        }: {
    readOnly: boolean;
    rows: any[];
    updateTotal: any;
    updateSelected: any;
    isPaid?: any;

}) {
    const [order, setOrder] = React.useState<Order>("asc");
    const [orderBy, setOrderBy] = React.useState<keyof CustomerSheet>("LoadTypeID");
    const [selected, setSelected] = React.useState<readonly string[]>([]);
    const [total, setTotal] = React.useState<number>(0);
    const [ownerWeeklies, setOwnerWeeklies] = React.useState<any>([])
    const [showPayModal, setShowPayModal] = React.useState<boolean>(false);
    const [initialJob, setInitialJob] = React.useState<any>(null);

    React.useEffect(() => {
        if (readOnly && isPaid) {
            setOwnerWeeklies(
                rows.filter((row) =>
                    row.Jobs?.some((job: {
                        Drivers: { OwnerOperator: any; };
                        PaidOut: any;
                    }) => job?.Drivers?.OwnerOperator && !job.PaidOut)
                )
                    .map((row) => row.ID)
            );

        }
    }, [])

    React.useEffect(() => {
        setSelected([]);
        setTotal(0);
    }, [rows]);

    const handleRequestSort = (
        event: React.MouseEvent<unknown>,
        property: keyof CustomerSheet
    ) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            let newTotal = 0;
            const newSelected = rows.map((n) => {
                newTotal += n.Revenue;
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
        Revenue: number
    ) => {
        const selectedIndex = selected.indexOf(ID);
        let newSelected: readonly string[] = [];
        let newTotal = 0;

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, ID);
            newTotal = total + Revenue;
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
            newTotal = total - Revenue;
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
            newTotal = total - Revenue;
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
            newTotal = total - Revenue;
        }
        setTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
        setSelected(newSelected);
        updateTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
        updateSelected(newSelected);
    };

    const handlePayModalClose = async () => {
        setInitialJob(null);
        setShowPayModal(false);
    }

    const isSelected = (ID: string) => selected.indexOf(ID) !== -1;

    return (
        <Box sx={{width: "100%"}}>
            <Paper sx={{width: "100%", mb: 2}}>
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
                        <TableBody key={rows + ownerWeeklies}>
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
                                        redBackground={isPaid ? ownerWeeklies.includes(row.ID) : null}
                                        setInitialJob={setInitialJob}
                                        setShowPayModal={setShowPayModal}
                                    />
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Modal
                    open={showPayModal}
                    onClose={handlePayModalClose}
                    aria-labelledby="paystub-modal-title"
                    aria-describedby="paystub-modal-description"
                    //disableScrollLock
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
                            overflowX: 'hidden', // Disable content scrolling
                            overflowY: 'scroll',
                            maxHeight: '95vh', // Prevent potential overflow
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
                            <Typography variant="h6" id="paystub-modal-title">
                                Create New Paystub
                            </Typography>
                            <IconButton onClick={handlePayModalClose} aria-label="close">
                                <CloseIcon />
                            </IconButton>
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
                            <PayStub initialJob={initialJob} drivers={[initialJob?.Drivers ?? []]} closeModal={handlePayModalClose}/>
                        </Box>

                        {/* Modal Footer (Empty for now) */}
                        <Box sx={{ mt: 2 }} />
                    </Box>
                </Modal>
            </Paper>
        </Box>
    );
}
