import React from 'react';
import {View, StyleSheet} from '@react-pdf/renderer';
import {CompleteJobs, CompleteLoads, LoadsModel} from "../../../prisma/zod";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import {z} from "zod";


const styles = StyleSheet.create({

    container: {
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
    },
});


const Table = ({jobs}: {jobs: CompleteJobs[]}) => {
    return (
        <View style={styles.container}>
            <TableHeader />
            {jobs.map((job, index) => <View key={'daily-row-' + index.toString()}>
                <TableRow job={job}/>
            </View>)}
        </View>
    )
}

export default Table