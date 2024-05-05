import React from 'react';
import {Page, Document, StyleSheet, Font, View} from '@react-pdf/renderer';
import WeeklyParts from "../../elements/WeeklyParts"
import Html from 'react-pdf-html';
import ReactDOMServer from 'react-dom/server';
import {z} from "zod";
import {
    CompleteJobs,
    LoadsModel,
    DriversModel,
    DailiesModel,
    CompleteWeeklies,
    CompleteCustomers, CompleteDeliveryLocations, CompleteLoadTypes
} from "../../../prisma/zod";
import moment from "moment/moment";

interface CustomerSheet extends CompleteWeeklies {
    Customers: CompleteCustomers,
    Jobs: CompleteJobs[],
    DeliveryLocations: CompleteDeliveryLocations,
    LoadTypes: CompleteLoadTypes
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
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 10
    }
});


const linebreak = <br/>;
const linebreakhtml = ReactDOMServer.renderToStaticMarkup(linebreak);

const dividerstyle = {div: {border: 1, borderStyle: 'dashed', borderColor: 'black', width: 600}}
const divider = <div/>;
const dividerhtml = ReactDOMServer.renderToStaticMarkup(divider);
const WeeklySheetFull = ({sheet, week, displayWeek, sums}: { sheet: CustomerSheet, week: string, displayWeek: string, sums: any}) => {

    return (
        <Document>
            <Page size='A4' style={styles.page} orientation={'landscape'}>
                <WeeklyParts.Title customer={sheet.Customers.Name} material={sheet.LoadTypes.Description} location={sheet.DeliveryLocations.Description} week={displayWeek}/>
                <Html>{linebreakhtml}</Html>
                <WeeklyParts.Table jobs={sheet.Jobs} sums={sums} rate={sheet.CompanyRate ?? 0} week={week} revenue={sheet.Revenue ?? 0}/>
            </Page>
        </Document>
    )
}

export default WeeklySheetFull;