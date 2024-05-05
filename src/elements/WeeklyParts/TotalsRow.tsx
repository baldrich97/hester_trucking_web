import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';
import {
    CompleteCustomers,
    CompleteDeliveryLocations,
    CompleteJobs,
    CompleteLoadTypes,
    CompleteWeeklies
} from "../../../prisma/zod";
import {z} from "zod";
import moment from "moment";
import Grid2 from "@mui/material/Unstable_Grid2";

interface CustomerSheet extends CompleteWeeklies {
    Customers: CompleteCustomers,
    Jobs: CompleteJobs[],
    DeliveryLocations: CompleteDeliveryLocations,
    LoadTypes: CompleteLoadTypes
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
        textAlign: 'center'
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


const TotalsRow = ({sums, revenue, rate}: { sums: any, revenue: number, rate: number }) => {
    const weightSum = sums.reduce((acc: any, obj: string | number) => {
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        return acc + obj
    }, 0);

    return (
        <View style={{
            ...styles.container,
            borderBottom: 2,
            borderBottomStyle: 'solid',
            borderBottomColor: 'black',
            borderRight: 0,
            borderTop: 0
        }} wrap={false} key={'row-container' + Math.random()}>
            <Text style={{
                width: '6%', ...styles.leftAlignNoPadding, ...styles.text,
            }}></Text>
            <Text style={{
                width: '12%',
                textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 15, fontWeight: 'bold'
            }}>TOTALS</Text>
            {["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN", 'weight', 'total'].map((day, index) =>

                <Text key={'row-' + Math.random()} style={{
                    width: '9%',
                    textAlign: 'center', ...styles.padding, ...styles.text,
                    fontSize: 12,
                    borderRight: 2
                }}>{day === 'weight' ? weightSum : day === 'total' ? revenue ? revenue : (Math.round((weightSum * rate) * 100) / 100) : sums[index]}</Text>
            )}
        </View>
    )
}

export default TotalsRow