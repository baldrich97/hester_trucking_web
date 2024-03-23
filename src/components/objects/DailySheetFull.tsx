import React from 'react';
import {Page, Document, StyleSheet, Font, View} from '@react-pdf/renderer';
import DailyParts from "../../elements/DailyParts"
import Html from 'react-pdf-html';
import ReactDOMServer from 'react-dom/server';
import {z} from "zod";
import {CompleteJobs, LoadsModel, DriversModel} from "../../../prisma/zod";

type Loads = z.infer<typeof LoadsModel>;

type Driver = z.infer<typeof DriversModel>;

interface JobsLoads extends CompleteJobs {
    Loads: Loads[]
}

interface DriverSheet extends Driver {
    Jobs: JobsLoads[]
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
        //lineHeight: 1.5,
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        paddingLeft: 5,
        paddingRight: 5,
        paddingTop: 10
    }
});


const linebreak = <br/>;
const linebreakhtml = ReactDOMServer.renderToStaticMarkup(linebreak);

const dividerstyle = {div: {border: 1, borderStyle: 'dashed', borderColor: 'black', width: 600}}
const divider = <div/>;
const dividerhtml = ReactDOMServer.renderToStaticMarkup(divider);

//const DailySheetFull = ({invoice, invoices = null}: { invoice: CompleteInvoices, invoices: CompleteInvoices[] | null }) => {
const DailySheetFull = ({sheet, week} : {sheet: DriverSheet, week: string}) => {
    return (
        <Document>
            <Page size='A4' style={styles.page} orientation={'landscape'}>
                <DailyParts.Title driver={sheet.FirstName + ' ' + sheet.LastName} week={week}/>
                <Html>{linebreakhtml}</Html>
                <DailyParts.Table jobs={sheet.Jobs}/>

            </Page>
        </Document>
    )
}

export default DailySheetFull;