import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';
import {CompleteInvoices, CompleteJobs, CompleteLoads, CompleteWeeklies} from "../../../prisma/zod";
import moment from "moment/moment";

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
        fontSize: 13,
    },
    leftAlignNoPadding: {
        textAlign: 'center',
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


const TableRow = ({job}: { job: any }) => {
    function formatDateRange(loads: any) {
        if (loads.length === 0) return null;

        // Sort the loads by StartDate to get the earliest and latest
        const dates = loads
            .map((load: { StartDate: string | number | Date; }) => new Date(load.StartDate))
            .sort((a: { getTime: () => number; }, b: { getTime: () => number; }) => a.getTime() - b.getTime());

        const earliest = dates[0];
        const latest = dates[dates.length - 1];

        // Check if both dates are the same
        if (earliest.getTime() === latest.getTime()) {
            return `${earliest.getUTCMonth() + 1}/${earliest.getUTCDate()}`; // Format as "2/13"
        }

        // Check if both dates are in the same month
        if (earliest.getUTCMonth() === latest.getUTCMonth() && earliest.getUTCFullYear() === latest.getUTCFullYear()) {
            return `${earliest.getUTCMonth() + 1}(${earliest.getUTCDate()}-${latest.getUTCDate()})`; // Format as "2(13-27)"
        }

        // Otherwise, format as "2/21-3/1"
        return `${earliest.getUTCMonth() + 1}/${earliest.getUTCDate()}-${latest.getUTCMonth() + 1}/${latest.getUTCDate()}`;
    }

    function sumLoads(loads: { Hours?: number; Weight?: number }[]): number {
        return loads.reduce((total, load) => {
            if (load.Hours) {
                return total + load.Hours;
            } else if (load.Weight) {
                return total + load.Weight;
            }
            return total;
        }, 0);
    }

    function calculateRevenue(row: {
        TruckingRate: number;
        DriverRate?: number;
        TruckingRevenue?: number;
        Loads: { Hours?: number; Weight?: number }[];
    }): number {
        if (row.TruckingRevenue) {
            return row.TruckingRevenue
        }
        const totalLoadValue = sumLoads(row.Loads);
        const rate = row.DriverRate && row.DriverRate !== row.TruckingRate
            ? row.DriverRate
            : row.TruckingRate;

        return totalLoadValue * rate;
    }

    function formatDescription(row: { LoadTypes: { Description: string; }; Customers: { Name: string; }; DeliveryLocations: { Description: string; }; }): string {
        return ((row.LoadTypes?.Description ?? 'MISSING') + ' ' + (row.Customers?.Name ?? 'MISSING') + ' ' + (row.DeliveryLocations?.Description ?? 'MISSING'))
    }

    function formatRate(row: { DriverRate: string; TruckingRate: string; }): string {
        return (Math.round((parseFloat((row.DriverRate && row.DriverRate !== row.TruckingRate) ? row.DriverRate : row.TruckingRate) + Number.EPSILON) * 100) /
            100).toString()
    }

    return (
        (
            <View style={styles.container}>
                <Text style={{
                    width: '10%', ...styles.leftAlignNoPadding, ...styles.text,
                    fontSize: 9
                }}>{formatDateRange(job.Loads)}</Text>
                <Text style={{
                    width: '55%',
                    textAlign: 'center', ...styles.padding, ...styles.text
                }}>{formatDescription(job)}</Text>
                <Text style={{
                    width: '10%',
                    textAlign: 'center', ...styles.padding, ...styles.text
                }}>{sumLoads(job.Loads)}</Text>
                <Text style={{
                    width: '10%',
                    textAlign: 'center', ...styles.text,
                    paddingRight: 5
                }}>{formatRate(job)}</Text>
                <Text style={{
                    width: '15%',
                    textAlign: 'center', ...styles.text,
                    paddingRight: 5
                }}>{calculateRevenue(job)}</Text>
            </View>
        )
    )
}

export default TableRow