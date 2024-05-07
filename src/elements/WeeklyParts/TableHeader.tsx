import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';
import Grid2 from "@mui/material/Unstable_Grid2";
import moment from "moment/moment";

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        borderStyle: 'solid',
        borderColor: 'black',
        borderWidth: 2,
        borderBottom: 2,
        borderBottomStyle: "solid",
        borderBottomColor: 'black',
        borderRight: 0
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 11,
        fontFamily: 'Times-Bold'
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
        minHeight: 36,
        maxHeight: 36
    }
});

const TableHeader = ({week, rate} : {week: string, rate: number}) => {

    const cols = [
        ["MON", moment(week).add(0, "days").format("MM/DD")],
        ["TUE", moment(week).add(1, "days").format("MM/DD")],
        ["WED", moment(week).add(2, "days").format("MM/DD")],
        ["THUR", moment(week).add(3, "days").format("MM/DD")],
        ["FRI", moment(week).add(4, "days").format("MM/DD")],
        ["SAT", moment(week).add(5, "days").format("MM/DD")],
        ["SUN", moment(week).add(6, "days").format("MM/DD")],
        ["Total", "Weight"],
        ["C. Rate", (Math.round(rate * 100) / 100)]
    ]

    return (
        <View style={styles.container}>
            <Text style={{width: '6%', ...styles.leftAlignNoPadding, ...styles.text, minHeight: 36, maxHeight: 36}}>TRK#</Text>
            <Text style={{width: '12%', textAlign: 'center', ...styles.padding, ...styles.text}}>Driver</Text>
            {cols.map((item) => (
                <View style={{flexDirection: 'column', width: '9%', display: 'flex', maxHeight: 36, borderRight: 2}} key={'row-' + Math.random()}>
                    <Text style={{width: '100%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 12, minHeight: 18, maxHeight: 18, borderRight: 0, borderBottom: 2}}>{item[0]}</Text>
                    <Text style={{width: '100%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 13, minHeight: 18, maxHeight: 18, borderRight: 0}}>{item[1]}</Text>
                </View>
            ))}
        </View>
    )
}

export default TableHeader