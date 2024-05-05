import React from 'react';
import {View, StyleSheet} from '@react-pdf/renderer';
import {CompleteJobs, CompleteLoads, LoadsModel} from "../../../prisma/zod";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import TotalsRow from "./TotalsRow";
import {z} from "zod";


const styles = StyleSheet.create({

    container: {
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
    },
});


const Table = ({jobs, week, rate, sums, revenue}: {jobs: CompleteJobs[], week: string, rate: number, sums: any, revenue: number}) => {
    return (
        <View style={styles.container}>
            <TableHeader week={week} rate={rate}/>
            {jobs.map((job, index) => <View key={'daily-row-' + index.toString()}>
                <TableRow job={job} week={week} rate={rate}/>
            </View>)}
            <TotalsRow sums={sums} revenue={revenue} rate={rate}/>
        </View>
    )
}

export default Table