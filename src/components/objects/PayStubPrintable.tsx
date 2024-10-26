import React from 'react';
import {Page, Document, StyleSheet, Font, View} from '@react-pdf/renderer';
import {DriversModel, JobsModel, PayStubsModel} from "../../../prisma/zod";
import PayStubParts from "../../elements/PayStubParts"
import Html from 'react-pdf-html';
import ReactDOMServer from 'react-dom/server';
import {z} from "zod";

type DriversType = z.infer<typeof DriversModel>;
type PayStubsType = z.infer<typeof PayStubsModel>;
type JobsType = z.infer<typeof JobsModel>;

interface PayStubData extends PayStubsType {
    Drivers: DriversType,
    Jobs: JobsType[],
}

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
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 50,
    }
});


const linebreak = <br/>;
const linebreakhtml = ReactDOMServer.renderToStaticMarkup(linebreak);

const PayStubPrintable = ({payStub}: { payStub: PayStubData}) => {

    const {Jobs, Drivers, ...rest} = payStub;

    return (
        <Document>
            <Page size='A4' style={styles.page}>
                <PayStubParts.Title/>
                <Html>{linebreakhtml}</Html>
                <PayStubParts.Header driver={(Drivers.FirstName + " " + Drivers.LastName)}
                                     invoiceDate={new Date(rest.Created).toLocaleDateString('en-US', {timeZone: 'UTC'})}
                                     checkNumber={rest.CheckNumber ? rest.CheckNumber : 'N/A'}/>
                <PayStubParts.Table jobs={Jobs} payStub={rest}/>

            </Page>
        </Document>
    )
}

export default PayStubPrintable;