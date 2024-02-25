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
  Number: number;
  InvoiceDate: any;
  TotalAmount: number;
  Printed: boolean;
  Paid: boolean;
  PaidDate: any;
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
  id: keyof Data;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  {
    id: "Number",
    numeric: false,
    disablePadding: true,
    label: "Invoice Number",
  },
  {
    id: "InvoiceDate",
    numeric: false,
    disablePadding: false,
    label: "Invoice Date",
  },
  {
    id: "TotalAmount",
    numeric: false,
    disablePadding: true,
    label: "T. Amount",
  },
  {
    id: "PaidDate",
    numeric: false,
    disablePadding: true,
    label: "Paid Date",
  },
  {
    id: "Printed",
    numeric: true,
    disablePadding: true,
    label: "Printed",
  },
];

interface EnhancedTableProps {
  onRequestSort: (
    event: React.MouseEvent<unknown>,
    property: keyof Data
  ) => void;
  order: Order;
  orderBy: string;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler =
    (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? "right" : "left"}
            padding={"normal"}
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

function EnhancedTableToolbar() {
  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        // ...(numSelected > 0 && {
        //   bgcolor: (theme) =>
        //     alpha(
        //       theme.palette.primary.main,
        //       theme.palette.action.activatedOpacity
        //     ),
        // }),
      }}
    >
      <Typography
        sx={{ flex: "1 1 100%" }}
        variant="h6"
        id="tableTitle"
        component="div"
      >
        Invoices Included
      </Typography>
    </Toolbar>
  );
}

function Row(props: { row: ReturnType<any>; labelId: string }) {
  const { row, labelId } = props;
  const [open, setOpen] = React.useState(false);

  return (
    <React.Fragment>
      <TableRow hover tabIndex={-1} key={Math.random().toString()}>
        <TableCell
          component="th"
          id={labelId}
          scope="row"
          padding={"normal"}
          size={"small"}
        >
          {row.Number}
        </TableCell>
        <TableCell align="left" padding="normal" size={"small"}>
          {row.InvoiceDate
            ? new Date(row.InvoiceDate).toLocaleDateString("en-US", {
                timeZone: "UTC",
              })
            : "N/A"}
        </TableCell>
        <TableCell align="left" padding="normal" size={"small"}>
          {Math.round((parseFloat(row.TotalAmount) + Number.EPSILON) * 100) /
            100}
        </TableCell>
        <TableCell align="left" padding="normal" size={"small"}>
          {row.PaidDate
            ? new Date(row.PaidDate).toLocaleDateString("en-US", {
                timeZone: "UTC",
              })
            : "N/A"}
        </TableCell>
        <TableCell align="right" padding="normal" size={"small"}>
          <Checkbox disabled={true} checked={!!row.Printed} />
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
      <TableRow sx={{ backgroundColor: "#d3d3d3" }}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Loads Included
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell align="left" padding="none" size={"small"}>
                      Ticket
                    </TableCell>
                    <TableCell align="left" padding="none" size={"small"}>
                      Date
                    </TableCell>
                    <TableCell align="left" padding="none" size={"small"}>
                      T. Rate
                    </TableCell>
                    <TableCell align="left" padding="none" size={"small"}>
                      T. Revenue
                    </TableCell>
                    <TableCell align="left" padding="none" size={"small"}>
                      Location
                    </TableCell>
                    <TableCell align="left" padding="none" size={"small"}>
                      Material
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.Loads.map((load: any) => {
                    return (
                      <TableRow key={"inner_row_" + row.ID.toString()}>
                        <TableCell align="left" padding="none" size={"small"}>
                          {load.TicketNumber}
                        </TableCell>
                        <TableCell align="left" padding="none" size={"small"}>
                          {load.StartDate
                            ? new Date(load.StartDate).toLocaleDateString(
                                "en-US",
                                {
                                  timeZone: "UTC",
                                }
                              )
                            : "N/A"}
                        </TableCell>
                        <TableCell align="left" padding="none" size={"small"}>
                          {Math.round(
                            (parseFloat(load.TotalRate) + Number.EPSILON) * 100
                          ) / 100}
                        </TableCell>
                        <TableCell align="left" padding="none" size={"small"}>
                          {Math.round(
                            (parseFloat(load.TotalAmount) + Number.EPSILON) *
                              100
                          ) / 100}
                        </TableCell>
                        <TableCell align="left" padding="none" size={"small"}>
                          {load.DeliveryLocations
                            ? load.DeliveryLocations?.Description
                            : "N/A"}
                        </TableCell>
                        <TableCell align="left" padding="none" size={"small"}>
                          {load.MaterialTypes
                            ? load.MaterialTypes?.Description
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default function ConsolidatedInvoices({ rows }: { rows: any[] }) {
  const [order, setOrder] = React.useState<Order>("asc");
  const [orderBy, setOrderBy] = React.useState<keyof Data>("Number");

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof Data
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <EnhancedTableToolbar />
        <TableContainer>
          <Table
            aria-labelledby="tableTitle"
            size={"small"}
            //sx={{minWidth: 750}}
          >
            <EnhancedTableHead
              order={order}
              orderBy={orderBy}
              onRequestSort={handleRequestSort}
            />
            <TableBody>
              {rows.sort(getComparator(order, orderBy)).map((row, index) => {
                const labelId = `enhanced-table-checkbox-${index}`;

                return (
                  <Row key={row.ID.toString()} row={row} labelId={labelId} />
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
