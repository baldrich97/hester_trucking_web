import React, {useState} from "react";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import {trpc} from "../utils/trpc";

const ROWS_PER_PAGE = 10;

type Procedure =
    | "customerloadtypes.getAllPage"
    | "customerdeliverylocations.getAllPage";

type PaginatedAssociationTableProps = {
    title: string;
    procedure: Procedure;
    customerId: number;
    initialCount: number;
    orderBy: string;
    emptyMessage: string;
    headCells: string[];
    renderCells: (row: Record<string, unknown>) => React.ReactNode;
    getRowKey: (row: Record<string, unknown>) => string;
};

export default function PaginatedAssociationTable({
    title,
    procedure,
    customerId,
    initialCount,
    orderBy,
    emptyMessage,
    headCells,
    renderCells,
    getRowKey,
}: PaginatedAssociationTableProps) {
    const [page, setPage] = useState(0);

    const {data, isLoading} = trpc.useQuery(
        [
            procedure,
            {
                CustomerID: customerId,
                page,
                orderBy,
                order: "desc",
            },
        ],
        {
            enabled: initialCount > 0 || page > 0,
            keepPreviousData: true,
        },
    );

    const rows = (data?.rows ?? []) as Record<string, unknown>[];
    const count = data?.count ?? initialCount;

    React.useEffect(() => {
        setPage(0);
    }, [customerId]);

    return (
        <>
            <Typography variant="h6" sx={{mb: 1}}>
                {title}
            </Typography>
            <Table size="small" sx={{width: "100%"}}>
                <TableHead>
                    <TableRow>
                        {headCells.map((cell) => (
                            <TableCell
                                key={cell}
                                align={cell.startsWith("Times") ? "right" : "left"}
                            >
                                {cell}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading && rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={headCells.length}>Loading…</TableCell>
                        </TableRow>
                    ) : rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={headCells.length}>{emptyMessage}</TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => (
                            <TableRow key={getRowKey(row)}>{renderCells(row)}</TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            {count > 0 ? (
                <TablePagination
                    component="div"
                    size="small"
                    count={count}
                    page={page}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={ROWS_PER_PAGE}
                    rowsPerPageOptions={[ROWS_PER_PAGE]}
                    labelDisplayedRows={({from, to, count: total}) =>
                        `${from}-${to} of ${total}`
                    }
                />
            ) : null}
        </>
    );
}
