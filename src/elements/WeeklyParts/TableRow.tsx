import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';
import {CompleteJobs} from "../../../prisma/zod";
import {z} from "zod";
import moment from "moment";
import Grid2 from "@mui/material/Unstable_Grid2";

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


const TableRow = ({job, week, rate}: { job: CompleteJobs, week: string, rate: number }) => {
    let weight = 0;

    for (let i = 0; i < 7; i++) {
        weight += job.Loads.filter((item) => moment.utc(item.StartDate, "YYYY-MM-DD").format("MM/DD") === moment(week).add(i, "days").format("MM/DD")).reduce((acc, obj) => {
            return acc + (obj.Hours ? obj.Hours : obj.Weight ? obj.Weight : 0)
        }, 0)
    }
    return (
        <View style={{
            ...styles.container,
            borderBottom: 2,
            borderBottomStyle: 'solid',
            borderBottomColor: 'black',
            borderRight: 0,
            borderTop: 0
        }} wrap={false} key={'row-' + job.ID}>
            <Text style={{
                width: '6%', ...styles.leftAlignNoPadding, ...styles.text,
            }}>{job.Loads[0]?.Trucks?.Notes ? job.Loads[0].Trucks?.Notes.split('#').length > 1 ? job.Loads[0].Trucks?.Notes.split('#')[1] : 'N/A' : 'N/A'}</Text>
            <Text style={{
                width: '12%',
                textAlign: 'center', ...styles.padding, ...styles.text
            }}>{job.Drivers.FirstName + ' ' + job.Drivers.LastName}</Text>
            {["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN", 'weight', 'total'].map((day, index) =>

                <Text key={'row-' + Math.random()} style={{
                    width: '9%',
                    textAlign: 'center', ...styles.padding, ...styles.text,
                    fontSize: 12,
                    borderRight: 2
                }}>{day === 'weight' ? (Math.round(weight * 100) / 100) : day === 'total' ? (Math.round((weight * rate) * 100) / 100) : (Math.round(job.Loads.filter((item) => moment.utc(item.StartDate, "YYYY-MM-DD").format("MM/DD") === moment(week).add(index, "days").format("MM/DD")).reduce((acc, obj) => {
                    return acc + (obj.Hours ? obj.Hours : obj.Weight ? obj.Weight : 0)
                }, 0) * 100) / 100)}</Text>
            )}
        </View>
    )
}

export default TableRow