import React from 'react';
import {View, StyleSheet} from '@react-pdf/renderer';
import {CompleteInvoices, CompleteLoads, CompleteWeeklies} from "../../../prisma/zod";
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


const Table = ({loads, total, invoices = null, weeklies = null, totalWeight = null}: {loads: CompleteLoads[], total: number, invoices: CompleteInvoices[] | null, weeklies: CompleteWeeklies[] | null, totalWeight: number | null}) => {
    return (
        <View style={styles.container}>
            <TableHeader isConsolidated={invoices !== null} hasWeeklies={weeklies !== null && weeklies?.length > 0}/>
            {invoices !== null ? invoices.map((invoice, index) =>
                (
                    <View key={'invoice-row-' + index.toString()} style={{top: '-7px'}}>
                        <TableRow invoice={invoice}/>
                    </View>
                )
            ) : weeklies !== null && weeklies?.length > 0 ?  weeklies.map((weekly, index) =>
                (
                    <View key={'invoice-row-' + index.toString()} style={{top: '-7px'}}>
                        <TableRow weekly={weekly}/>
                    </View>
                )
            ) :  loads.map((load, index) =>
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