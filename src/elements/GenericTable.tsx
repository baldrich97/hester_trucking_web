import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import NextLink from 'next/link'
import { styled } from '@mui/material/styles';

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

export default function GenericTable({data = [], columns = [], overrides = []}: {data: any[], columns: {name: string, as?: string, align?: 'left' | 'right' | 'center' | 'justify' | 'inherit' | undefined, navigateTo?: string}[], overrides: {name: string, type: 'checkbox' | 'button'}[]}) {
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
                    {data.map((row, rowindex) => {
                        return (
                            <StyledTableRow key={'row-' + rowindex.toString()}>
                                {columns.map((column, colindex) => {
                                    let realData = null;
                                    if(column.name.includes('.')) {
                                        realData = column.name.split('.').reduce((o,i) => o[i], row)
                                    }
                                    const data = realData ?? row[column.name];
                                    const isOverrided = overrides.filter((item) => item.name === column.name);
                                    if (colindex === 0) {
                                        return (
                                            <StyledTableCell component="th" scope="row" align={column.align ? column.align : 'left'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                {data ?? 'N/A'}
                                            </StyledTableCell>
                                        )
                                    } else if (isOverrided && typeof(isOverrided[0]) !== 'undefined') {
                                        switch (isOverrided[0].type) {
                                            case "button":
                                                return (
                                                    <StyledTableCell align={column.align ? column.align : 'right'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                        <NextLink href={column.navigateTo + row[column.name].toString()} passHref>
                                                            <Button color={'primary'} variant={'contained'}>
                                                                View
                                                            </Button>
                                                        </NextLink>
                                                    </StyledTableCell>
                                                )

                                            case "checkbox":
                                                return (
                                                    <StyledTableCell align={column.align ? column.align : 'center'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                        <Checkbox value={!!data} disabled={true}/>
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
            </Table>
        </TableContainer>
    );
}