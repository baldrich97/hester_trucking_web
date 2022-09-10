import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import NextLink from 'next/link'

export default function GenericTable({data = [], columns = [], overrides = []}: {data: any[], columns: {name: string, as?: string, align?: 'left' | 'right' | 'center' | 'justify' | 'inherit' | undefined, navigateTo?: string}[], overrides: {name: string, type: 'checkbox' | 'button'}[]}) {
    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                    <TableRow>
                        {columns.map((column) => {
                            return <TableCell align={column.align ? column.align : 'left'} key={column.name + '-header'}>{column.as ?? column.name}</TableCell>
                        })}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row, rowindex) => {
                        return (
                            <TableRow
                                key={'row-' + rowindex.toString()}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                {columns.map((column, colindex) => {
                                    let realData = null;
                                    if(column.name.includes('.')) {
                                        realData = column.name.split('.').reduce((o,i) => o[i], row)
                                    }
                                    const data = realData ?? row[column.name];
                                    const isOverrided = overrides.filter((item) => item.name === column.name);
                                    if (colindex === 0) {
                                        return (
                                            <TableCell component="th" scope="row" align={column.align ? column.align : 'left'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                {data ?? 'N/A'}
                                            </TableCell>
                                        )
                                    } else if (isOverrided && typeof(isOverrided[0]) !== 'undefined') {
                                        switch (isOverrided[0].type) {
                                            case "button":
                                                return (
                                                    <TableCell align={column.align ? column.align : 'center'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                        <NextLink href={column.navigateTo + row[column.name].toString()} passHref>
                                                            <Button color={'primary'}>
                                                                View
                                                            </Button>
                                                        </NextLink>
                                                    </TableCell>
                                                )

                                            case "checkbox":
                                                return (
                                                    <TableCell align={column.align ? column.align : 'center'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                        <Checkbox value={!!data} disabled={true}/>
                                                    </TableCell>
                                                )
                                        }
                                    } else {
                                        return (
                                            <TableCell align={column.align ? column.align : 'left'} key={'row-' + rowindex.toString() + '-' + column.name}>
                                                {data ?? 'N/A'}
                                            </TableCell>
                                        )
                                    }
                                })}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}