import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';
import {CompleteInvoices, CompleteLoads} from "../../../prisma/zod";

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        borderStyle: 'solid',
        borderWidth: 2,
        borderColor: 'grey',
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 8,
    },
    leftAlignNoPadding: {
        textAlign: 'left',
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
    },
    padding: {
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
        paddingLeft: 2,
    }
});


const TableRow = ({load, invoice = null}: {load?: CompleteLoads, invoice?: CompleteInvoices | null}) => (
    <View style={styles.container}>
        {invoice !== null ? <>
            <Text style={{width: '10%', ...styles.leftAlignNoPadding, ...styles.text}}>{new Date(invoice.InvoiceDate).toLocaleDateString()}</Text>
            <Text style={{width: '10%', textAlign: 'left', ...styles.padding, ...styles.text}}>{invoice.Number}</Text>
            <Text style={{width: '73%', textAlign: 'left', ...styles.padding, ...styles.text}}>{invoice.Loads.map((load) => `#${load.TicketNumber}`).join(', ')}</Text>
            <Text style={{width: '8%', textAlign: 'right', ...styles.text, paddingRight: 5}}>{invoice.TotalAmount ? (Math.round(invoice.TotalAmount * 100) / 100).toString() : 'N/A'}</Text>
        </> : load ? <>
            <Text style={{width: '10%', ...styles.leftAlignNoPadding, ...styles.text}}>{new Date(load.StartDate).toLocaleDateString()}</Text>
            <Text style={{width: '10%', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.Trucks?.Notes ?? 'N/A'}</Text>
            <Text style={{width: '25%', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.LoadTypes?.Description ?? 'N/A'}</Text>
            <Text style={{width: '30%', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.DeliveryLocations?.Description ?? 'N/A'}</Text>
            <Text style={{width: '6%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.Weight ? (Math.round(load.Weight * 100)/100).toString() : '0'}</Text>
            <Text style={{width: '6%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.Hours ? (Math.round(load.Hours * 100)/100).toString() : '0'}</Text>
            <Text style={{width: '6%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.TotalRate ? (Math.round(load.TotalRate * 100)/100).toString() : '0'}</Text>
            <Text style={{width: '8%', textAlign: 'right', ...styles.text, paddingRight: 5}}>{load.TotalAmount ? (Math.round(load.TotalAmount * 100) / 100).toString() : 'N/A'}</Text>
        </> : null}
    </View>
)

export default TableRow