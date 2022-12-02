import React from 'react';
import { Page, Document, StyleSheet } from '@react-pdf/renderer';
import {CompleteInvoices} from "../../../prisma/zod";
import InvoiceParts from "../../elements/InvoiceParts"

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Arial',
        fontSize: 11,
        lineHeight: 1.5,
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center'
    }
});

const InvoicePrintableBasix = ({invoice} : {invoice: CompleteInvoices}) => {
    const total = invoice.Loads.reduce((acc, obj) => {return acc + (obj.TotalAmount ? obj.TotalAmount : 0)}, 0)
    return (
        <Document>
            <Page size='A4' style={styles.page}>
                <InvoiceParts.Title/>
                <br/>
                <br/>
                <InvoiceParts.Header customer={invoice.Customers} invoiceDate={new Date(invoice.InvoiceDate).toLocaleDateString()} invoiceNumber={invoice.Number ? invoice.Number.toString() : 'N/A'}/>
                <br/>
                <InvoiceParts.Table loads={invoice.Loads} total={total}/>
                <br/>
                <InvoiceParts.Disclaimer/>
                <br/>
                <div style={{border: 1, borderStyle: 'dashed', borderColor: 'black', width: '100%'}}/>
                <br/>
                <InvoiceParts.Footer customer={invoice.Customers} invoiceDate={new Date(invoice.InvoiceDate).toLocaleDateString()} invoiceNumber={invoice.Number ? invoice.Number.toString() : 'N/A'} total={total}/>
            </Page>
        </Document>
    )
}

export default InvoicePrintableBasix;