import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TablePagination from '@mui/material/TablePagination';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import NextLink from 'next/link'
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';

import {TableColumnsType, TableColumnOverridesType} from "../utils/types";


interface TablePaginationActionsProps {
    count: number;
    page: number;
    rowsPerPage: number;
    onPageChange: (
        event: React.MouseEvent<HTMLButtonElement>,
        newPage: number,
    ) => void;
}


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
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0,
    },
}));


function TablePaginationActions(props: TablePaginationActionsProps) {
    const theme = useTheme();
    const { count, page, rowsPerPage, onPageChange } = props;

    const handleFirstPageButtonClick = (
        event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        onPageChange(event, 0);
    };

    const handleBackButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        onPageChange(event, page - 1);
    };

    const handleNextButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        onPageChange(event, page + 1);
    };

    const handleLastPageButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
    };

    return (
        <Box sx={{ flexShrink: 0, ml: 2.5 }}>
            <IconButton
                onClick={handleFirstPageButtonClick}
                disabled={page === 0}
                aria-label="first page"
            >
                {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
            </IconButton>
            <IconButton
                onClick={handleBackButtonClick}
                disabled={page === 0}
                aria-label="previous page"
            >
                {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
            </IconButton>
            <IconButton
                onClick={handleNextButtonClick}
                disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                aria-label="next page"
            >
                {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
            </IconButton>
            <IconButton
                onClick={handleLastPageButtonClick}
                disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                aria-label="last page"
            >
                {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
            </IconButton>
        </Box>
    );
}



export default function GenericTable({data = [], columns = [], overrides = [], count}: {data: any[], columns: TableColumnsType, overrides: TableColumnOverridesType, count: number}) {

    const [page, setPage] = React.useState(0);

    const handleChangePage = (
        event: React.MouseEvent<HTMLButtonElement> | null,
        newPage: number,
    ) => {
        setPage(newPage);
    };

    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} size={'small'}>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => {
                            return <StyledTableCell align={column.align ? column.align : 'left'} key={column.name + '-header'}>{column.as ?? column.name}</StyledTableCell>
                        })}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.slice(page * 10, page * 10 + 10).map((row, rowindex) => {
                        return (
                            <StyledTableRow key={'row-' + rowindex.toString()}>
                                {columns.map((column) => {
                                    let realData = null;
                                    if(column.name.includes('.')) {
                                        realData = column.name.split('.').reduce((o,i) => {
                                            if (!o) {
                                                return
                                            }
                                            return o[i];
                                        }, row)
                                    }
                                    const data = realData ?? row[column.name];
                                    const isOverrided = overrides.filter((item) => item.name === column.name);
                                    if (isOverrided && typeof(isOverrided[0]) !== 'undefined') {
                                        switch (isOverrided[0].type) {
                                            case "button":
                                                return (
                                                    <StyledTableCell align={column.align ? column.align : 'right'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                        <NextLink href={column.navigateTo + row[column.name].toString()} passHref>
                                                            <Button color={'primary'} variant={'contained'}>
                                                                Edit
                                                            </Button>
                                                        </NextLink>
                                                    </StyledTableCell>
                                                )

                                            case "checkbox":
                                                return (
                                                    <StyledTableCell align={column.align ? column.align : 'center'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                        <Checkbox disabled={true} checked={!!data}/>
                                                    </StyledTableCell>
                                                )

                                            case "link":
                                                let link = null;
                                                if (column.navigateTo?.includes('[ID]')) {
                                                    const linkRoot = column.name.split('.')[0];
                                                    const linkID = linkRoot && row[linkRoot]['ID'];
                                                    link = column.navigateTo?.replace('[ID]', linkID.toString())
                                                }
                                                link = link ?? column.navigateTo ?? '';
                                                return (
                                                    <StyledTableCell align={column.align ? column.align : 'left'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                        <NextLink href={link} passHref>
                                                            <a target={"_blank"} style={{textDecoration: 'underline'}}>{data}</a>
                                                        </NextLink>
                                                    </StyledTableCell>
                                                )
                                            case "date":
                                                const displayDate = data ? new Date(data).toLocaleDateString() : 'N/A';
                                                return (
                                                    <StyledTableCell align={column.align ? column.align : 'left'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                        {displayDate}
                                                    </StyledTableCell>
                                                )
                                        }
                                    } else {
                                        return (
                                            <StyledTableCell align={column.align ? column.align : 'left'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                {data ?? 'N/A'}
                                            </StyledTableCell>
                                        )
                                    }
                                })}
                            </StyledTableRow>
                        )
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TablePagination
                            rowsPerPageOptions={[]}
                            count={count}
                            rowsPerPage={10}
                            page={page}
                            onPageChange={handleChangePage}
                            ActionsComponent={TablePaginationActions}
                        />
                    </TableRow>
                </TableFooter>
            </Table>
        </TableContainer>
    );
}