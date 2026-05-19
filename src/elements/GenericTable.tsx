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
import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPageIcon from "@mui/icons-material/LastPage";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import TableSortLabel from "@mui/material/TableSortLabel";
import { visuallyHidden } from "@mui/utils";

import NextLink from "next/link";
import { TableColumnsType, TableColumnOverridesType } from "../utils/types";
import {tableContainedNavButtonSx} from "../theme/muiShared";
import Modal from "@mui/material/Modal";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TableEntityLink from "./TableEntityLink";
import BasicAutocomplete from "./Autocomplete";

/**
 * Filter-modal match mode used by every table that exposes a search modal
 * (loads list, mass-edit, invoice tabs, overdue invoices, …).
 *
 *   - "all"  → user-typed conditions are AND-ed together (Exact match).
 *   - "any"  → user-typed conditions are OR-ed together (Partial match).
 *
 * The string values match the `matchMode` Zod enum on the server.
 */
export type TableFilterMatchMode = "all" | "any";

interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number
  ) => void;
  onRefresh?: () => void;
  lastRefreshedAt?: Date | null;
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
  const { count, page, rowsPerPage, onPageChange, onRefresh, lastRefreshedAt } = props;

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
      {onRefresh ? (
        <Tooltip
          title={
            lastRefreshedAt
              ? `Last refreshed: ${lastRefreshedAt.toLocaleString()}`
              : "Refresh table data"
          }
        >
          <IconButton
            onClick={onRefresh}
            aria-label="refresh table data"
            sx={{ mr: 1 }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      ) : null}
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
  page: controlledPage,
  setCustomer = null,
  selectedCustomer = null,
  filterBody = null,
  doSearch = null,
  clearFilter = null,
  searchSet = false,
  matchMode = "all",
  onMatchModeChange = null,
  emptyMessage = "No matching records. Try different filters or clear the search.",
}: {
  data: any[];
  columns: TableColumnsType;
  overrides: TableColumnOverridesType;
  count?: number;
  refreshData?: any;
  /** When set, keeps pagination UI in sync with the parent query page. */
  page?: number;
  setCustomer?: any;
  selectedCustomer?: any;
  filterBody?: any;
  /** Called when the user clicks "Apply" inside the filter modal. */
  doSearch?: any;
  /** Called when the user clicks "Clear" inside the filter modal or the
   * header X chip (also called nowhere else — backdrop / Cancel keep state). */
  clearFilter?: any;
  searchSet?: boolean;
  /** Current Exact/Partial mode. Defaults to "all" (Exact). */
  matchMode?: TableFilterMatchMode;
  /** Notified when the user toggles Exact/Partial. */
  onMatchModeChange?: ((mode: TableFilterMatchMode) => void) | null;
  emptyMessage?: string;
}) {
  //console.log(data, columns, overrides);

  const [page, setPage] = React.useState(0);

  React.useEffect(() => {
    if (typeof controlledPage === "number") {
      setPage(controlledPage);
    }
  }, [controlledPage]);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);

  const [showCustomerModal, setShowCustomerModal] = React.useState(false);

  const [order, setOrder] = React.useState<"asc" | "desc">("desc");
  const [orderBy, setOrderBy] = React.useState("ID");

  const triggerRefresh = React.useCallback(
    (nextPage: number, nextOrderBy: string, nextOrder: "asc" | "desc") => {
      if (typeof refreshData === "function") {
        refreshData(nextPage, nextOrderBy, nextOrder);
        setLastRefreshedAt(new Date());
      }
    },
    [refreshData]
  );

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
    triggerRefresh(newPage, orderBy, order);
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
                    <Box
                      sx={{
                        display: "inline-flex",
                        flexDirection: "row",
                        gap: 0.75,
                        justifyContent: "flex-end",
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label="open filter modal"
                        title={searchSet ? "Edit filters" : "Filter results"}
                        onClick={() => setShowCustomerModal(true)}
                        sx={{
                          bgcolor: "primary.main",
                          color: "common.white",
                          width: 36,
                          height: 36,
                          "&:hover": {bgcolor: "primary.dark"},
                        }}
                      >
                        <SearchIcon fontSize="small" />
                      </IconButton>
                      {searchSet ? (
                        <IconButton
                          size="small"
                          aria-label="clear filters"
                          title="Clear filters"
                          onClick={() => {
                            setPage(0);
                            if (typeof clearFilter === "function") clearFilter();
                          }}
                          sx={{
                            bgcolor: "error.main",
                            color: "common.white",
                            width: 36,
                            height: 36,
                            "&:hover": {bgcolor: "error.dark"},
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                    </Box>
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
                        const nextOrderBy = column.column ? column.column : column.name;
                        let nextOrder: "asc" | "desc" = "asc";
                        if (
                          orderBy === column.name ||
                          orderBy === column.column
                        ) {
                          nextOrder = order === "asc" ? "desc" : "asc";
                          setOrder(nextOrder);
                        } else {
                          setOrderBy(nextOrderBy);
                          setOrder("asc");
                        }
                        triggerRefresh(page, nextOrderBy, nextOrder);
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
          {data.length === 0 ? (
            <StyledTableRow>
              <StyledTableCell
                colSpan={columns.length}
                align="center"
                sx={{ py: 5, borderBottom: "none" }}
              >
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </StyledTableCell>
            </StyledTableRow>
          ) : (
          data.map((row, rowindex) => {
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
                  if (column.name.includes('+')) {
                      realData = column.name.split("+").map((key, index) => {
                          let returnable;
                          if (key.includes(".")) {
                              returnable = key.split(".").reduce((o, i) => {
                                  if (!o) {
                                      return;
                                  }
                                  return o[i];
                              }, row);
                          } else {
                              returnable = row[key];
                          }

                          return index + 1 === column.name.split("+").length ? returnable : (returnable + ' ')
                      })
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
                                column.navigateTo +
                                row[column.name].toString()
                              }
                              passHref
                              legacyBehavior
                            >
                              <Button
                                component="a"
                                target="_blank"
                                rel="noopener noreferrer"
                                color="primary"
                                variant="contained"
                                size="small"
                                sx={tableContainedNavButtonSx}
                              >
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
                              variant="contained"
                              color="error"
                              size="small"
                              sx={{minWidth: 40, maxWidth: 40}}
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
                            <Checkbox
                              checked={!!data}
                              onClick={() => {
                                if (isOverrided[0]) {
                                  isOverrided[0].callback(row);
                                }
                              }}
                            />
                          </StyledTableCell>
                        );

                      case "link":
                        let link = null;
                        if (column.navigateTo?.includes("[ID]")) {
                          const linkRoot = column.name.split(".")[0];
                          const linkID =
                            column.name.includes(".") && linkRoot
                              ? row[linkRoot]["ID"]
                              : row[column.name];
                          link = column.navigateTo?.replace(
                            "[ID]",
                            linkID?.toString()
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
                            <TableEntityLink href={link}>{data}</TableEntityLink>
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
                          ? !/\D/.test(data) && parseFloat(data) && !data.toString().includes(" ")
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
          })
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[]}
              count={count ?? -1}
              rowsPerPage={10}
              page={page}
              onPageChange={handleChangePage}
              ActionsComponent={(subProps) => (
                <TablePaginationActions
                  {...subProps}
                  onRefresh={
                    typeof refreshData === "function"
                      ? () => triggerRefresh(page, orderBy, order)
                      : undefined
                  }
                  lastRefreshedAt={lastRefreshedAt}
                />
              )}
            />
          </TableRow>
        </TableFooter>
      </Table>
      <Modal
        open={showCustomerModal}
        // Backdrop / Escape just dismiss the modal — draft filter state is
        // preserved so the user can reopen it and fine-tune without re-entering
        // values. Clearing is an explicit action (Clear button below, or the
        // dedicated header X icon).
        onClose={() => setShowCustomerModal(false)}
      >
        <Box sx={style}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{fontWeight: 600}}>
              Filter results
            </Typography>
            <ToggleButtonGroup
              value={matchMode}
              exclusive
              size="small"
              color="primary"
              onChange={(_e, next) => {
                if (next === null) return; // user clicked the active button
                if (typeof onMatchModeChange === "function") {
                  onMatchModeChange(next as TableFilterMatchMode);
                }
              }}
              aria-label="filter match mode"
            >
              <ToggleButton value="all" aria-label="match all filters">
                Exact (all)
              </ToggleButton>
              <ToggleButton value="any" aria-label="match any filter">
                Partial (any)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {filterBody ?? <></>}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 2.5,
              gap: 1,
            }}
          >
            <Button
              variant="text"
              color="inherit"
              onClick={() => setShowCustomerModal(false)}
            >
              Cancel
            </Button>
            <Box sx={{display: "flex", gap: 1}}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setPage(0);
                  setShowCustomerModal(false);
                  if (typeof clearFilter === "function") clearFilter();
                }}
              >
                Clear filters
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setPage(0);
                  setShowCustomerModal(false);
                  if (typeof doSearch === "function") doSearch();
                }}
              >
                Apply
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </TableContainer>
  );
}
