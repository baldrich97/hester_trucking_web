import React from 'react';
import { Page, Document, StyleSheet, Font } from '@react-pdf/renderer';
import {CompleteInvoices} from "../../../prisma/zod";
import InvoiceParts from "../../elements/InvoiceParts"
import Html from 'react-pdf-html';
import ReactDOMServer from 'react-dom/server';

Font.register({
    family: 'Nunito',
    fonts: [
        { src: 'https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,300&display=swap', fontWeight: 300, fontStyle: 'italic'},
        { src: 'https://fonts.googleapis.com/css2?family=Nunito:wght@500&display=swap', fontWeight: 500}
    ],
})
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Nunito',
        lineHeight: 1.5,
        fontWeight: 400,
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        paddingLeft: 5,
        paddingRight: 5
    }
});


const linebreak = <br/>;
const linebreakhtml = ReactDOMServer.renderToStaticMarkup(linebreak);

const dividerstyle = {div: {border: 1, borderStyle: 'dashed', borderColor: 'black', width: 600}}
const divider = <div/>;
const dividerhtml = ReactDOMServer.renderToStaticMarkup(divider);

const InvoicePrintableBasic = ({invoice} : {invoice: CompleteInvoices}) => {
    const total = invoice.Loads.reduce((acc, obj) => {return acc + (obj.TotalAmount ? obj.TotalAmount : 0)}, 0)
    return (
        <Document>
            <Page size='A4' style={styles.page}>
                <InvoiceParts.Title/>
                <Html>{linebreakhtml}</Html>
                <InvoiceParts.Header customer={invoice.Customers} invoiceDate={new Date(invoice.InvoiceDate).toLocaleDateString()} invoiceNumber={invoice.Number ? invoice.Number.toString() : 'N/A'}/>
                <InvoiceParts.Table loads={invoice.Loads} total={total}/>
                <Html>{linebreakhtml}</Html>
                <InvoiceParts.Disclaimer/>
                <Html stylesheet={dividerstyle} collapse={false}>{dividerhtml}</Html>
                <InvoiceParts.Footer customer={invoice.Customers} invoiceDate={new Date(invoice.InvoiceDate).toLocaleDateString()} invoiceNumber={invoice.Number ? invoice.Number.toString() : 'N/A'} total={total}/>
            </Page>
        </Document>
    )
}

export default InvoicePrintableBasic;