import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';
import {CompleteLoads} from "../../../prisma/zod";

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
        fontSize: 8,
    },
    leftAlignNoPadding: {
        textAlign: 'left',
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
    },
    padding: {
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
        paddingLeft: 5,
    }
});


const TableRow = ({load}: {load: CompleteLoads}) => (
    <View style={styles.container}>
        <Text style={{width: '10%', ...styles.leftAlignNoPadding, ...styles.text}}>{new Date(load.StartDate).toLocaleDateString()}</Text>
        <Text style={{width: '10%', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.Trucks?.Notes ?? 'N/A'}</Text>
        <Text style={{width: '25%', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.LoadTypes?.Description ?? 'N/A'}</Text>
        <Text style={{width: '32%', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.DeliveryLocations?.Description ?? 'N/A'}</Text>
        <Text style={{width: '8%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.Weight?.toString()}</Text>
        <Text style={{width: '5%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.Hours?.toString()}</Text>
        <Text style={{width: '5%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.TotalRate?.toString()}</Text>
        <Text style={{width: '5%', textAlign: 'right', ...styles.text, paddingRight: 5}}>{load.TotalAmount ? (Math.round(load.TotalAmount * 100) / 100).toString() : 'N/A'}</Text>
    </View>
)

export default TableRow