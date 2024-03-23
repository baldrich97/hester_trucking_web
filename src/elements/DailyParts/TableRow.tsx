import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';
import {CompleteJobs, LoadsModel} from "../../../prisma/zod";
import {z} from "zod";
import moment from "moment";

type Loads = z.infer<typeof LoadsModel>;

interface JobsLoads extends CompleteJobs {
    Loads: Loads[]
}

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        borderTopStyle: 'solid',
        borderLeftStyle: 'solid',
        borderRightStyle: 'solid',
        borderTopColor: 'black',
        borderLeftColor: 'black',
        borderRightColor: 'black',
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 2,
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 10,
        fontFamily: 'Times-Roman'
    },
    leftAlignNoPadding: {
        textAlign: 'left',
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
    },
    padding: {
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
        paddingLeft: 2,
        minHeight: 30
    }
});


const TableRow = ({job}: {job: JobsLoads}) => {
    let weight = 0;
    return (
        <>
            {job.Loads.map((load, index) => {
                weight += load.Weight ? load.Weight : load.Hours ? load.Hours : 0;
                return (
                    <View style={{...styles.container, borderTop: index === 0 ? 2 : 0, borderBottom: 2, borderBottomStyle: 'solid', borderBottomColor: 'black', minHeight: 30}} wrap={false} key={'row-' + index}>
                        <Text style={{width: '5%', ...styles.leftAlignNoPadding, ...styles.text}}>{moment(load.StartDate).format("M/D")}</Text>
                        <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}>{job.LoadTypes?.Description}</Text>
                        <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}>{job.Customers.Name}</Text>
                        <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}>{job.DeliveryLocations?.Description}</Text>
                        <Text style={{width: '17.5%', textAlign: 'center', ...styles.padding, ...styles.text}}>#{load.TicketNumber ? load.TicketNumber : 'N/A'}</Text>
                        <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.TruckRate}</Text>
                        <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.MaterialRate}</Text>
                        <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.Weight ? load.Weight : load.Hours ? load.Hours : 0}</Text>
                        <Text style={{width: '15%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 15}}></Text>
                        <Text style={{width: '15%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 15, borderRight: 0}}></Text>
                    </View>
                )
            })}
            <View style={{...styles.container, borderBottom: 2, borderBottomStyle: 'solid', borderBottomColor: 'black', minHeight: 30}} wrap={false} key={'row-total-' + job.ID}>
                <Text style={{width: '5%', ...styles.leftAlignNoPadding, ...styles.text}}></Text>
                <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}></Text>
                <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}></Text>
                <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}></Text>
                <Text style={{width: '17.5%', textAlign: 'center', ...styles.padding, ...styles.text}}></Text>
                <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5}}></Text>
                <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5}}></Text>
                <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', fontSize: 15}}>{weight}</Text>
                <Text style={{width: '15%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 13, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                    ${(Math.round((job.CompanyRevenue ?? (weight * (job?.Loads[0]?.TruckRate ? job?.Loads[0]?.TruckRate : 0))) * 100) / 100).toString()}</Text>
                <Text style={{width: '15%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 13, borderRight: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                    ${(Math.round((job.TruckingRevenue ?? (weight * (job?.Loads[0]?.MaterialRate ? job?.Loads[0]?.MaterialRate : 0))) * 100) / 100).toString()}</Text>
            </View>

            <View style={{minHeight: 30, width: '100%'}} wrap={false} key={'row-total-padding' + job.ID}>

            </View>
        </>
    )
}

export default TableRow