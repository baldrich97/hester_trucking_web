import React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TablePagination from "@mui/material/TablePagination";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import NextLink from "next/link";
import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPageIcon from "@mui/icons-material/LastPage";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TableSortLabel from "@mui/material/TableSortLabel";
import { visuallyHidden } from "@mui/utils";

import { TableColumnsType, TableColumnOverridesType } from "../utils/types";
import Modal from "@mui/material/Modal";
import BasicAutocomplete from "./Autocomplete";

interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number
  ) => void;
}

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "white",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.grey["600"],
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

function TablePaginationActions(props: TablePaginationActionsProps) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === "rtl" ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowRight />
        ) : (
          <KeyboardArrowLeft />
        )}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowLeft />
        ) : (
          <KeyboardArrowRight />
        )}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === "rtl" ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

export default function GenericTable({
  data = [],
  columns = [],
  overrides = [],
  count,
  refreshData,
  setCustomer = null,
  selectedCustomer = null,
  filterBody = null,
  doSearch = null,
  clearFilter = null,
}: {
  data: any[];
  columns: TableColumnsType;
  overrides: TableColumnOverridesType;
  count?: number;
  refreshData?: any;
  setCustomer?: any;
  selectedCustomer?: any;
  filterBody?: any;
  doSearch?: any;
  clearFilter?: any;
}) {
  //console.log(data, columns, overrides);

  const [page, setPage] = React.useState(0);

  const [opened, setOpened] = React.useState(false);

  const [showCustomerModal, setShowCustomerModal] = React.useState(false);

  const [order, setOrder] = React.useState<"asc" | "desc">("desc");
  const [orderBy, setOrderBy] = React.useState("ID");

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
    if (typeof refreshData === "function") {
      refreshData(newPage, orderBy, order);
    }
  };

  //console.log(columns)
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} size={"small"}>
        <TableHead>
          <TableRow>
            {columns.map((column) => {
              if (column.as === "" && filterBody) {
                return (
                  <StyledTableCell align={"right"} key={"lookup-header"}>
                    {opened ? (
                      <Button
                        style={{ backgroundColor: "red", borderRadius: 20 }}
                        onClick={() => {
                          clearFilter();
                          setOpened(false);
                        }}
                      >
                        <CloseIcon style={{ color: "white" }} />
                      </Button>
                    ) : (
                      <Button
                        style={{ backgroundColor: "#1565C0", borderRadius: 20 }}
                        onClick={() => {
                          setShowCustomerModal(true);
                          setOpened(true);
                        }}
                      >
                        <SearchIcon style={{ color: "white" }} />
                      </Button>
                    )}
                  </StyledTableCell>
                );
              }
              return (
                <StyledTableCell
                  align={column.align ? column.align : "left"}
                  key={column.name + "-header"}
                >
                  {column.as === "" ? (
                    <>{column.as ?? column.name}</>
                  ) : (
                    <TableSortLabel
                      active={
                        orderBy === column.name || orderBy === column.column
                      }
                      direction={
                        orderBy === column.name || orderBy === column.column
                          ? order
                          : "asc"
                      }
                      onClick={() => {
                        if (
                          orderBy === column.name ||
                          orderBy === column.column
                        ) {
                          setOrder(order === "asc" ? "desc" : "asc");
                        } else {
                          setOrderBy(
                            column.column ? column.column : column.name
                          );
                          setOrder("asc");
                        }
                        refreshData(page, orderBy, order);
                      }}
                    >
                      {column.as ?? column.name}
                      {orderBy === column.name || orderBy === column.column ? (
                        <Box component="span" sx={visuallyHidden}>
                          {order === "desc"
                            ? "sorted descending"
                            : "sorted ascending"}
                        </Box>
                      ) : null}
                    </TableSortLabel>
                  )}
                </StyledTableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, rowindex) => {
            return (
              <StyledTableRow key={"row-" + rowindex.toString()}>
                {columns.map((column) => {
                  let realData = null;
                  if (column.name.includes(".")) {
                    realData = column.name.split(".").reduce((o, i) => {
                      if (!o) {
                        return;
                      }
                      return o[i];
                    }, row);
                  }
                  const data = realData ?? row[column.name];
                  const isOverrided = overrides.filter(
                    (item) => item.name === column.name
                  );
                  if (isOverrided && typeof isOverrided[0] !== "undefined") {
                    switch (isOverrided[0].type) {
                      case "button":
                        return (
                          <StyledTableCell
                            align={column.align ? column.align : "right"}
                            key={
                              "row-" + rowindex.toString() + "-" + column.name
                            }
                          >
                            <NextLink
                              href={
                                column.navigateTo + row[column.name].toString()
                              }
                              passHref
                            >
                              <Button color={"primary"} variant={"contained"}>
                                Edit
                              </Button>
                            </NextLink>
                          </StyledTableCell>
                        );

                      case "action":
                        return (
                          <StyledTableCell
                            align={column.align ? column.align : "right"}
                            key={
                              "row-" + rowindex.toString() + "-" + column.name
                            }
                          >
                            <Button
                              variant={"contained"}
                              color={"primary"}
                              style={{
                                backgroundColor: "red",
                                minWidth: "40px",
                                maxWidth: "40px",
                              }}
                              size="small"
                              onClick={() => {
                                if (isOverrided[0]) {
                                  isOverrided[0].callback(
                                    isOverrided[0].name.includes(".")
                                      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                                        row[isOverrided[0].name.split(".")[1]]
                                      : row
                                  );
                                }
                              }}
                            >
                              {isOverrided[0].icon
                                ? isOverrided[0].icon
                                : isOverrided[0].name}
                            </Button>
                          </StyledTableCell>
                        );

                      case "checkbox":
                        return (
                          <StyledTableCell
                            align={column.align ? column.align : "center"}
                            key={
                              "row-" + rowindex.toString() + "-" + column.name
                            }
                          >
                            <Checkbox disabled={true} checked={!!data} />
                          </StyledTableCell>
                        );

                        case "checkbox-action":
                            return (
                                <StyledTableCell
                                    align={column.align ? column.align : "center"}
                                    key={
                                        "row-" + rowindex.toString() + "-" + column.name
                                    }
                                >
                                    <Checkbox checked={!!data} onClick={() => {
                                        if (isOverrided[0]) {
                                            isOverrided[0].callback(row)
                                        }
                                    }}/>
                                </StyledTableCell>
                            );

                      case "link":
                        let link = null;
                        if (column.navigateTo?.includes("[ID]")) {
                          const linkRoot = column.name.split(".")[0];
                          const linkID = linkRoot && row[linkRoot]["ID"];
                          link = column.navigateTo?.replace(
                            "[ID]",
                            linkID.toString()
                          );
                        }
                        link = link ?? column.navigateTo ?? "";
                        return (
                          <StyledTableCell
                            align={column.align ? column.align : "left"}
                            key={
                              "row-" + rowindex.toString() + "-" + column.name
                            }
                          >
                            <NextLink href={link} passHref>
                              <a
                                target={"_blank"}
                                style={{ textDecoration: "underline" }}
                              >
                                {data}
                              </a>
                            </NextLink>
                          </StyledTableCell>
                        );
                      case "date":
                        const displayDate = data
                          ? new Date(data).toLocaleDateString("en-US", {
                              timeZone: "UTC",
                            })
                          : "N/A";
                        return (
                          <StyledTableCell
                            align={column.align ? column.align : "left"}
                            key={
                              "row-" + rowindex.toString() + "-" + column.name
                            }
                          >
                            {displayDate}
                          </StyledTableCell>
                        );
                    }
                  } else {
                    return (
                      <StyledTableCell
                        align={column.align ? column.align : "left"}
                        key={"row-" + rowindex.toString() + "-" + column.name}
                      >
                        {data
                          ? parseFloat(data) && !data.toString().includes(" ")
                            ? Math.round(
                                (parseFloat(data) + Number.EPSILON) * 100
                              ) / 100
                            : data
                          : "N/A"}
                      </StyledTableCell>
                    );
                  }
                })}
              </StyledTableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[]}
              count={count ?? -1}
              rowsPerPage={10}
              page={page}
              onPageChange={handleChangePage}
              ActionsComponent={count ? TablePaginationActions : undefined}
            />
          </TableRow>
        </TableFooter>
      </Table>
      <Modal
        open={showCustomerModal}
        onClose={() => {
          clearFilter();
          setShowCustomerModal(false);
          setOpened(false);
        }}
      >
        <Box sx={style}>
          {filterBody ?? <></>}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Button
              variant={"contained"}
              color={"primary"}
              style={{ backgroundColor: "#1565C0" }}
              onClick={() => {
                setShowCustomerModal(false);
                doSearch();
              }}
            >
              Search
            </Button>
            <Button
              variant={"contained"}
              color={"primary"}
              style={{ backgroundColor: "#757575" }}
              onClick={() => {
                setShowCustomerModal(false);
                clearFilter();
                setOpened(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>
    </TableContainer>
  );
}
