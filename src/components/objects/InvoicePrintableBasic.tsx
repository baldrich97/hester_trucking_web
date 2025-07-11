import React from 'react';
import {Page, Document, StyleSheet, Font, View} from '@react-pdf/renderer';
import {CompleteInvoices} from "../../../prisma/zod";
import InvoiceParts from "../../elements/InvoiceParts"
import Html from 'react-pdf-html';
import ReactDOMServer from 'react-dom/server';

Font.register({
    family: 'Nunito',
    fonts: [
        {src: 'https://fonts.gstatic.com/s/nunito/v8/kpI87QY2ce-mk2ZnKb-r0g.ttf'},
        {src: 'https://fonts.gstatic.com/s/nunito/v8/B4-BGlpEzQ4WP-D3Zi0PRQ.ttf', fontWeight: 600}
    ],
})
const styles = StyleSheet.create({
    page: {
        lineHeight: 1.5,
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        paddingLeft: 1,
        paddingRight: 1
    },
    avoidBreak: {
        // lineHeight: 1.5,
        // flexDirection: 'column',
        // display: 'flex',
        // alignItems: 'center',
        // textAlign: 'center',
        // paddingLeft: 1,
        // paddingRight: 1,
        breakInside: 'avoid',
        marginTop: 10
    }
});


const linebreak = <br/>;
const linebreakhtml = ReactDOMServer.renderToStaticMarkup(linebreak);

const dividerstyle = {div: {border: 1, borderStyle: 'dashed', borderColor: 'black', width: 600}}
const divider = <div/>;
const dividerhtml = ReactDOMServer.renderToStaticMarkup(divider);

const InvoicePrintableBasic = ({invoice, invoices = null}: { invoice: CompleteInvoices, invoices: CompleteInvoices[] | null }) => {
    const total = invoices !== null ? invoices.reduce((acc, obj) => {
        return acc + (obj.TotalAmount ? obj.TotalAmount : 0)
    }, 0) : invoice.Weeklies.length > 0 ? invoice.Weeklies.reduce((acc, obj) => {
        return acc + (obj.Revenue ? obj.Revenue : 0)
    }, 0) : invoice.Loads.reduce((acc, obj) => {
        return acc + (obj.TotalAmount ? obj.TotalAmount : 0)
    }, 0)

    const totalWeight = invoice.Weeklies.length > 0 ? invoice.Weeklies.reduce((acc, obj) => {
        return acc + (obj.TotalWeight ? obj.TotalWeight : 0)
    }, 0) : invoice.Loads.reduce((acc, obj) => {
        return acc + (obj.Weight ? obj.Weight : obj.Hours ? obj.Hours : 0)
    }, 0)

    return (
        <Document>
            <Page size='A4' style={styles.page}>
                <InvoiceParts.Title isConsolidated={invoices !== null}/>
                <Html>{linebreakhtml}</Html>
                <InvoiceParts.Header customer={invoice.Customers}
                                     invoiceDate={new Date(invoice.InvoiceDate).toLocaleDateString('en-US', {timeZone: 'UTC'})}
                                     invoiceNumber={invoice.Number ? invoice.Number.toString() : 'N/A'}/>
                <InvoiceParts.Table loads={invoice.Loads} total={total} invoices={invoices} weeklies={invoice.Weeklies} totalWeight={totalWeight}/>
                <View wrap={false} style={styles.avoidBreak}>
                    <InvoiceParts.Disclaimer/>
                    <Html stylesheet={dividerstyle} collapse={false}>{dividerhtml}</Html>
                    <InvoiceParts.Footer customer={invoice.Customers}
                                         invoiceDate={new Date(invoice.InvoiceDate).toLocaleDateString('en-US', {timeZone: 'UTC'})}
                                         invoiceNumber={invoice.Number ? invoice.Number.toString() : 'N/A'} total={total}/>

                </View>
                {/*<Html>{linebreakhtml}</Html>*/}
            </Page>
        </Document>
    )
}

export default InvoicePrintableBasic;