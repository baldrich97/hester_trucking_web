import React from 'react';
import {View, StyleSheet} from '@react-pdf/renderer';
import {
    CompleteInvoices,
    CompleteJobs,
    CompleteLoads,
    CompleteWeeklies,
    DriversModel, JobsModel,
    PayStubsModel
} from "../../../prisma/zod";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import TableFooter from "./TableFooter";
import {z} from "zod";

type PayStubsType = z.infer<typeof PayStubsModel>;

const styles = StyleSheet.create({

    container: {
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
    },
});


const Table = ({jobs, payStub}: {jobs: any[], payStub: PayStubsType}) => {
    return (
        <View style={styles.container}>
            <TableHeader/>
            {jobs.map((job, index) =>
                <View key={'row-' + index.toString()} style={{top: '-7px'}}>
                    <TableRow job={job}/>
                </View>
            )}
            <TableFooter payStub={payStub}/>
        </View>
    )
}

export default Table