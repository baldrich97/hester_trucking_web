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
import CircularProgress from "@mui/material/CircularProgress";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPageIcon from "@mui/icons-material/LastPage";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import TableSortLabel from "@mui/material/TableSortLabel";
import { visuallyHidden } from "@mui/utils";
import Modal from "@mui/material/Modal";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import NextLink from "next/link";

import { TableColumnsType, TableColumnOverridesType } from "../utils/types";
import { tableContainedNavButtonSx } from "../theme/muiShared";
import TableEntityLink from "./TableEntityLink";
import { trpc } from "../utils/trpc";

/** Rows per page — must match skip/take on the server (10). */
const ROWS_PER_PAGE = 10;

/**
 * Filter-modal match mode (loads, invoices, overdue, …).
 * Values match the `matchMode` Zod enum on the server.
 */
export type TableFilterMatchMode = "all" | "any";

/** `paginated` → `{ rows, count }` from tRPC. `array` → `T[]` from tRPC. */
export type QueryResultShape = "paginated" | "array";

export type GenericTableHandle = {
  /** Re-fetch the current page (e.g. after creating a record in a side panel). */
  refresh: () => void;
};

export type GenericTableProps = {
  columns: TableColumnsType;
  overrides: TableColumnOverridesType;
  emptyMessage?: string;

  // --- Static mode (no tRPC): pass rows directly ---
  rows?: any[];
  rowCount?: number;

  // --- Server-backed mode ---
  /** e.g. `"loads.getAllPage"` */
  trpcQuery?: string;
  /** Filters from the parent; page/order/orderBy are added automatically. */
  trpcInput?: Record<string, unknown>;
  resultShape?: QueryResultShape;
  /** SSR first page — shown until the user paginates, sorts, or filters. */
  initialRows?: any[];
  initialCount?: number;
  defaultOrderBy?: string;
  defaultOrder?: "asc" | "desc";
  /**
   * When true, always load from the server (search text, applied filters, etc.).
   * When false and the user is still on page 0 with default sort, `initialRows` are shown.
   */
  remoteActive?: boolean;
  /** Optional separate count endpoint (e.g. overdue invoices with filters). */
  trpcCountQuery?: string;
  trpcCountInput?: Record<string, unknown>;
  /** Fetch on mount even on page 0 (tables with no SSR rows but a non-zero count). */
  fetchOnMount?: boolean;
  /** Bumps when filters are applied/cleared — resets to page 0. */
  filterRevision?: number;

  // --- Filter modal ---
  filterBody?: React.ReactNode;
  searchSet?: boolean;
  matchMode?: TableFilterMatchMode;
  onMatchModeChange?: ((mode: TableFilterMatchMode) => void) | null;
  onApplyFilters?: () => void;
  onClearFilters?: () => void;

  tableRef?: React.Ref<GenericTableHandle>;

  /** @deprecated Use `rows` — parent-managed data (legacy). Omit when using `trpcQuery`. */
  data?: any[];
  /** @deprecated Use `rowCount` */
  count?: number;
  /** @deprecated Parent refetch callback — use `trpcQuery` for built-in fetching */
  refreshData?: (page: number, orderBy: string, order: "asc" | "desc") => void;
  /** @deprecated Controlled page index from parent (legacy) */
  page?: number;
  /** @deprecated Use `onApplyFilters` */
  doSearch?: () => void;
  /** @deprecated Use `onClearFilters` */
  clearFilter?: () => void;
};

const filterModalSx = {
  position: "absolute" as const,
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
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

type PaginationActionsProps = {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number,
  ) => void;
  onRefresh?: () => void;
  isFetching?: boolean;
};

function TablePaginationActions({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRefresh,
  isFetching,
}: PaginationActionsProps) {
  const theme = useTheme();
  const lastPage = Math.max(0, Math.ceil(count / rowsPerPage) - 1);

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5, display: "flex", alignItems: "center" }}>
      {isFetching ? (
        <CircularProgress size={22} sx={{ mr: 1 }} aria-label="Loading page" />
      ) : null}
      {onRefresh ? (
        <Tooltip title="Refresh table data">
          <IconButton onClick={onRefresh} aria-label="refresh table data" sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      ) : null}
      <IconButton onClick={(e) => onPageChange(e, 0)} disabled={page === 0} aria-label="first page">
        {theme.direction === "rtl" ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={(e) => onPageChange(e, page - 1)}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === "rtl" ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={(e) => onPageChange(e, page + 1)}
        disabled={page >= lastPage}
        aria-label="next page"
      >
        {theme.direction === "rtl" ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={(e) => onPageChange(e, lastPage)}
        disabled={page >= lastPage}
        aria-label="last page"
      >
        {theme.direction === "rtl" ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

/** Deep-clone row data so react-query cache objects are safe to render. */
function cloneRows<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows)) as T[];
}

function getCellValue(row: any, columnName: string): unknown {
  if (columnName.includes(".")) {
    return columnName.split(".").reduce((o, key) => (o ? o[key] : undefined), row);
  }
  if (columnName.includes("+")) {
    return columnName
      .split("+")
      .map((key, index, parts) => {
        let value: unknown;
        if (key.includes(".")) {
          value = key.split(".").reduce((o: any, k) => (o ? o[k] : undefined), row);
        } else {
          value = row[key];
        }
        return index + 1 === parts.length ? value : `${value ?? ""} `;
      })
      .join("");
  }
  return row[columnName];
}

type TableRowCellsProps = {
  row: any;
  rowIndex: number;
  columns: TableColumnsType;
  overrides: TableColumnOverridesType;
};

function TableRowCells({ row, rowIndex, columns, overrides }: TableRowCellsProps) {
  return (
    <>
      {columns.map((column) => {
        const raw = getCellValue(row, column.name);
        const override = overrides.find((o) => o.name === column.name);

        if (override) {
          switch (override.type) {
            case "button":
              return (
                <StyledTableCell
                  align={column.align ?? "right"}
                  key={`row-${rowIndex}-${column.name}`}
                >
                  <NextLink
                    href={column.navigateTo + row[column.name].toString()}
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
                  align={column.align ?? "right"}
                  key={`row-${rowIndex}-${column.name}`}
                >
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    sx={{ minWidth: 40, maxWidth: 40 }}
                    onClick={() => {
                      override.callback(
                        override.name.includes(".")
                          ? row[override.name.split(".")[1]!]
                          : row,
                      );
                    }}
                  >
                    {override.icon ?? override.name}
                  </Button>
                </StyledTableCell>
              );
            case "checkbox":
              return (
                <StyledTableCell
                  align={column.align ?? "center"}
                  key={`row-${rowIndex}-${column.name}`}
                >
                  <Checkbox disabled checked={!!raw} />
                </StyledTableCell>
              );
            case "checkbox-action":
              return (
                <StyledTableCell
                  align={column.align ?? "center"}
                  key={`row-${rowIndex}-${column.name}`}
                >
                  <Checkbox checked={!!raw} onClick={() => override.callback(row)} />
                </StyledTableCell>
              );
            case "link": {
              let href = column.navigateTo ?? "";
              if (column.navigateTo?.includes("[ID]")) {
                const linkRoot = column.name.split(".")[0]!;
                const linkId = column.name.includes(".")
                  ? row[linkRoot]?.ID
                  : row[column.name];
                href = column.navigateTo.replace("[ID]", linkId?.toString() ?? "");
              }
              return (
                <StyledTableCell
                  align={column.align ?? "left"}
                  key={`row-${rowIndex}-${column.name}`}
                >
                            <TableEntityLink href={href}>{raw as React.ReactNode}</TableEntityLink>
                </StyledTableCell>
              );
            }
            case "date": {
              const displayDate = raw
                ? new Date(raw as string).toLocaleDateString("en-US", { timeZone: "UTC" })
                : "N/A";
              return (
                <StyledTableCell
                  align={column.align ?? "left"}
                  key={`row-${rowIndex}-${column.name}`}
                >
                  {displayDate}
                </StyledTableCell>
              );
            }
          }
        }

        const display =
          raw != null && raw !== ""
            ? !/\D/.test(String(raw)) &&
              parseFloat(String(raw)) &&
              !String(raw).includes(" ")
              ? Math.round((parseFloat(String(raw)) + Number.EPSILON) * 100) / 100
              : raw
            : "N/A";

        return (
          <StyledTableCell
            align={column.align ?? "left"}
            key={`row-${rowIndex}-${column.name}`}
          >
            {display as React.ReactNode}
          </StyledTableCell>
        );
      })}
    </>
  );
}

function GenericTableInner({
  columns,
  overrides,
  emptyMessage = "No matching records. Try different filters or clear the search.",
  rows: staticRows,
  rowCount: staticRowCount,
  trpcQuery,
  trpcInput = {},
  resultShape = "paginated",
  initialRows = [],
  initialCount = 0,
  defaultOrderBy = "ID",
  defaultOrder = "desc",
  remoteActive = false,
  trpcCountQuery,
  trpcCountInput,
  fetchOnMount = false,
  filterRevision = 0,
  filterBody,
  searchSet = false,
  matchMode = "all",
  onMatchModeChange = null,
  onApplyFilters,
  onClearFilters,
  tableRef,
}: GenericTableProps) {
  const [page, setPage] = React.useState(0);
  const [orderBy, setOrderBy] = React.useState(defaultOrderBy);
  const [order, setOrder] = React.useState<"asc" | "desc">(defaultOrder);
  const [useRemote, setUseRemote] = React.useState(fetchOnMount || remoteActive);
  const [showFilterModal, setShowFilterModal] = React.useState(false);

  const isDefaultSort = orderBy === defaultOrderBy && order === defaultOrder;
  const isFirstPage = page === 0;

  // Show SSR/bootstrap data only on page 0 with default sort and no active remote triggers.
  const showInitialData =
    !!trpcQuery &&
    !useRemote &&
    isFirstPage &&
    isDefaultSort &&
    !remoteActive;

  const shouldFetch = !!trpcQuery && !showInitialData;

  const queryInput = React.useMemo(
    () => ({ ...trpcInput, page, orderBy, order }),
    [trpcInput, page, orderBy, order],
  );

  const { data, isFetching, refetch } = trpc.useQuery(
    [trpcQuery!, queryInput] as any,
    {
      enabled: shouldFetch,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    },
  );

  const countInput = trpcCountInput ?? trpcInput;
  const { data: countFromExtraQuery } = trpc.useQuery(
    [trpcCountQuery!, countInput] as any,
    {
      enabled: shouldFetch && !!trpcCountQuery,
      refetchOnWindowFocus: false,
    },
  );

  React.useImperativeHandle(tableRef, () => ({
    refresh: () => {
      setUseRemote(true);
      void refetch();
    },
  }));

  // Parent applied/cleared filters — go back to page 0 and load from server.
  React.useEffect(() => {
    if (filterRevision > 0) {
      setPage(0);
      setUseRemote(true);
    }
  }, [filterRevision]);

  // Search or filter state turned off — return to SSR bootstrap when possible.
  React.useEffect(() => {
    if (!remoteActive && !searchSet) {
      setPage(0);
      setOrderBy(defaultOrderBy);
      setOrder(defaultOrder);
      if (!fetchOnMount) {
        setUseRemote(false);
      }
    }
  }, [remoteActive, searchSet, defaultOrderBy, defaultOrder, fetchOnMount]);

  const prevRemoteActive = React.useRef(remoteActive);
  React.useEffect(() => {
    if (remoteActive && !prevRemoteActive.current) {
      setPage(0);
      setUseRemote(true);
    }
    prevRemoteActive.current = remoteActive;
  }, [remoteActive]);

  const remoteRows = React.useMemo(() => {
    if (!data) return [];
    if (resultShape === "array") {
      return cloneRows(Array.isArray(data) ? (data as any[]) : []);
    }
    const paginated = data as { rows?: any[] };
    return cloneRows(paginated.rows ?? []);
  }, [data, resultShape]);

  const remoteCount = React.useMemo(() => {
    if (trpcCountQuery && countFromExtraQuery != null) {
      return countFromExtraQuery as number;
    }
    if (resultShape === "paginated" && data) {
      return (data as { count: number }).count ?? initialCount;
    }
    return initialCount;
  }, [trpcCountQuery, countFromExtraQuery, resultShape, data, initialCount]);

  const displayRows = showInitialData
    ? (initialRows ?? staticRows ?? [])
    : trpcQuery
      ? remoteRows
      : (staticRows ?? []);

  const displayCount = showInitialData
    ? (initialCount ?? staticRowCount ?? displayRows.length)
    : trpcQuery
      ? remoteCount
      : (staticRowCount ?? displayRows.length);

  const goToPage = (newPage: number) => {
    setPage(newPage);
    if (trpcQuery) {
      const backToBootstrap =
        newPage === 0 && isDefaultSort && !remoteActive && !searchSet;
      setUseRemote(!backToBootstrap);
    }
  };

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    goToPage(newPage);
  };

  const handleSort = (columnOrderBy: string) => {
    const isActive = orderBy === columnOrderBy;
    const nextOrder: "asc" | "desc" = isActive && order === "asc" ? "desc" : "asc";
    setOrderBy(columnOrderBy);
    setOrder(nextOrder);
    setPage(0);
    if (trpcQuery) {
      const sortIsDefault = columnOrderBy === defaultOrderBy && nextOrder === defaultOrder;
      setUseRemote(!sortIsDefault || remoteActive || searchSet);
    }
  };

  const handleApplyFilters = () => {
    setPage(0);
    setUseRemote(true);
    setShowFilterModal(false);
    onApplyFilters?.();
  };

  const handleClearFilters = () => {
    setPage(0);
    setOrderBy(defaultOrderBy);
    setOrder(defaultOrder);
    setUseRemote(fetchOnMount);
    setShowFilterModal(false);
    onClearFilters?.();
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => {
              if (column.as === "" && filterBody) {
                return (
                  <StyledTableCell align="right" key="lookup-header">
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
                        onClick={() => setShowFilterModal(true)}
                        sx={{
                          bgcolor: "primary.main",
                          color: "common.white",
                          width: 36,
                          height: 36,
                          "&:hover": { bgcolor: "primary.dark" },
                        }}
                      >
                        <SearchIcon fontSize="small" />
                      </IconButton>
                      {searchSet ? (
                        <IconButton
                          size="small"
                          aria-label="clear filters"
                          title="Clear filters"
                          onClick={handleClearFilters}
                          sx={{
                            bgcolor: "error.main",
                            color: "common.white",
                            width: 36,
                            height: 36,
                            "&:hover": { bgcolor: "error.dark" },
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                    </Box>
                  </StyledTableCell>
                );
              }

              const sortKey = column.column ?? column.name;
              const sortActive = orderBy === column.name || orderBy === column.column;

              return (
                <StyledTableCell
                  align={column.align ?? "left"}
                  key={`${column.name}-header`}
                >
                  {column.as === "" ? (
                    column.name
                  ) : (
                    <TableSortLabel
                      active={sortActive}
                      direction={sortActive ? order : "asc"}
                      onClick={() => handleSort(sortKey)}
                    >
                      {column.as ?? column.name}
                      {sortActive ? (
                        <Box component="span" sx={visuallyHidden}>
                          {order === "desc" ? "sorted descending" : "sorted ascending"}
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
          {displayRows.length === 0 && !isFetching ? (
            <StyledTableRow>
              <StyledTableCell colSpan={columns.length} align="center" sx={{ py: 5, borderBottom: "none" }}>
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </StyledTableCell>
            </StyledTableRow>
          ) : (
            displayRows.map((row, rowIndex) => (
              <StyledTableRow key={`row-${rowIndex}`}>
                <TableRowCells
                  row={row}
                  rowIndex={rowIndex}
                  columns={columns}
                  overrides={overrides}
                />
              </StyledTableRow>
            ))
          )}
        </TableBody>

        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[]}
              count={displayCount}
              rowsPerPage={ROWS_PER_PAGE}
              page={page}
              onPageChange={handleChangePage}
              ActionsComponent={(subProps) => (
                <TablePaginationActions
                  {...subProps}
                  onRefresh={trpcQuery ? () => { setUseRemote(true); void refetch(); } : undefined}
                  isFetching={isFetching && shouldFetch}
                />
              )}
            />
          </TableRow>
        </TableFooter>
      </Table>

      {filterBody ? (
        <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)}>
          <Box sx={filterModalSx}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Filter results
              </Typography>
              <ToggleButtonGroup
                value={matchMode}
                exclusive
                size="small"
                color="primary"
                onChange={(_e, next) => {
                  if (next !== null) onMatchModeChange?.(next as TableFilterMatchMode);
                }}
                aria-label="filter match mode"
              >
                <ToggleButton value="all">Exact (all)</ToggleButton>
                <ToggleButton value="any">Partial (any)</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {filterBody}

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
              <Button variant="text" color="inherit" onClick={() => setShowFilterModal(false)}>
                Cancel
              </Button>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="outlined" color="error" onClick={handleClearFilters}>
                  Clear filters
                </Button>
                <Button variant="contained" color="primary" onClick={handleApplyFilters}>
                  Apply
                </Button>
              </Box>
            </Box>
          </Box>
        </Modal>
      ) : null}
    </TableContainer>
  );
}

/**
 * Legacy parent-managed tables: pagination/sort call `refreshData` and the parent
 * runs tRPC. Prefer `trpcQuery` on new pages (see loads/index.tsx).
 */
function StaticGenericTable({
  columns,
  overrides,
  emptyMessage = "No matching records. Try different filters or clear the search.",
  data = [],
  rows,
  count,
  rowCount,
  refreshData,
  page: controlledPage,
  filterBody,
  searchSet = false,
  matchMode = "all",
  onMatchModeChange = null,
  doSearch,
  clearFilter,
  defaultOrderBy = "ID",
  defaultOrder = "desc",
}: GenericTableProps) {
  const [localPage, setLocalPage] = React.useState(0);
  const [orderBy, setOrderBy] = React.useState(defaultOrderBy);
  const [order, setOrder] = React.useState<"asc" | "desc">(defaultOrder);
  const [showFilterModal, setShowFilterModal] = React.useState(false);

  const page = typeof controlledPage === "number" ? controlledPage : localPage;
  const displayRows = rows ?? data ?? [];
  const displayCount = rowCount ?? count ?? displayRows.length;

  const notifyParent = (nextPage: number, nextOrderBy: string, nextOrder: "asc" | "desc") => {
    if (typeof refreshData === "function") {
      refreshData(nextPage, nextOrderBy, nextOrder);
    }
  };

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    if (typeof controlledPage !== "number") {
      setLocalPage(newPage);
    }
    notifyParent(newPage, orderBy, order);
  };

  const handleSort = (columnOrderBy: string) => {
    const isActive = orderBy === columnOrderBy;
    const nextOrder: "asc" | "desc" = isActive && order === "asc" ? "desc" : "asc";
    setOrderBy(columnOrderBy);
    setOrder(nextOrder);
    if (typeof controlledPage !== "number") {
      setLocalPage(0);
    }
    notifyParent(0, columnOrderBy, nextOrder);
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => {
              if (column.as === "" && filterBody) {
                return (
                  <StyledTableCell align="right" key="lookup-header">
                    <Box sx={{ display: "inline-flex", flexDirection: "row", gap: 0.75, justifyContent: "flex-end" }}>
                      <IconButton size="small" onClick={() => setShowFilterModal(true)} sx={{ bgcolor: "primary.main", color: "common.white", width: 36, height: 36 }}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                      {searchSet ? (
                        <IconButton size="small" onClick={() => { if (typeof controlledPage !== "number") setLocalPage(0); notifyParent(0, orderBy, order); clearFilter?.(); }} sx={{ bgcolor: "error.main", color: "common.white", width: 36, height: 36 }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                    </Box>
                  </StyledTableCell>
                );
              }
              const sortKey = column.column ?? column.name;
              const sortActive = orderBy === column.name || orderBy === column.column;
              return (
                <StyledTableCell align={column.align ?? "left"} key={`${column.name}-header`}>
                  {column.as === "" ? column.name : (
                    <TableSortLabel active={sortActive} direction={sortActive ? order : "asc"} onClick={() => handleSort(sortKey)}>
                      {column.as ?? column.name}
                    </TableSortLabel>
                  )}
                </StyledTableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {displayRows.length === 0 ? (
            <StyledTableRow>
              <StyledTableCell colSpan={columns.length} align="center" sx={{ py: 5, borderBottom: "none" }}>
                <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
              </StyledTableCell>
            </StyledTableRow>
          ) : (
            displayRows.map((row, rowIndex) => (
              <StyledTableRow key={`row-${rowIndex}`}>
                <TableRowCells row={row} rowIndex={rowIndex} columns={columns} overrides={overrides} />
              </StyledTableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[]}
              count={displayCount}
              rowsPerPage={ROWS_PER_PAGE}
              page={page}
              onPageChange={handleChangePage}
              ActionsComponent={(subProps) => (
                <TablePaginationActions
                  {...subProps}
                  onRefresh={refreshData ? () => notifyParent(page, orderBy, order) : undefined}
                />
              )}
            />
          </TableRow>
        </TableFooter>
      </Table>
      {filterBody ? (
        <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)}>
          <Box sx={filterModalSx}>
            <ToggleButtonGroup value={matchMode} exclusive size="small" onChange={(_e, next) => { if (next !== null) onMatchModeChange?.(next as TableFilterMatchMode); }}>
              <ToggleButton value="all">Exact (all)</ToggleButton>
              <ToggleButton value="any">Partial (any)</ToggleButton>
            </ToggleButtonGroup>
            {filterBody}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
              <Button variant="outlined" color="error" onClick={() => { setShowFilterModal(false); if (typeof controlledPage !== "number") setLocalPage(0); notifyParent(0, orderBy, order); clearFilter?.(); }}>Clear filters</Button>
              <Button variant="contained" onClick={() => { setShowFilterModal(false); if (typeof controlledPage !== "number") setLocalPage(0); notifyParent(0, orderBy, order); doSearch?.(); }}>Apply</Button>
            </Box>
          </Box>
        </Modal>
      ) : null}
    </TableContainer>
  );
}

export default function GenericTable(props: GenericTableProps) {
  if (props.trpcQuery) {
    return <GenericTableInner {...props} />;
  }
  return <StaticGenericTable {...props} />;
}
