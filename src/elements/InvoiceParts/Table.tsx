import React from 'react';
import {View, StyleSheet} from '@react-pdf/renderer';
import {CompleteLoads} from "../../../prisma/zod";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import TableFooter from "./TableFooter";
import Disclaimer from "./Disclaimer";

const styles = StyleSheet.create({

    container: {
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
    },
});


const Table = ({loads, total}: {loads: CompleteLoads[], total: number}) => {
    return (
        <View style={styles.container}>
            <TableHeader/>
            {loads.map((load, index) =>
                (
                    <View key={'invoice-row-' + index.toString()} style={{top: '-7px'}}>
                        <TableRow load={load}/>
                    </View>
                )
            )}
            <TableFooter total={total}/>
        </View>
    )
}

export default Table