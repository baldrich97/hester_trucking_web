import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';
import {CompleteLoads} from "../../../prisma/zod";

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        outlineStyle: 'solid',
        outlineWidth: 'medium',
        outlineColor: 'grey',
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 16,
    },
    leftAlignNoPadding: {
        textAlign: 'left',
        borderRight: 3,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
    },
    padding: {
        borderRight: 3,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
        paddingLeft: 5,
    }
});


const TableRow = ({load}: {load: CompleteLoads}) => (
    <View style={styles.container}>
        <Text style={{width: '8rem', ...styles.leftAlignNoPadding, ...styles.text}}>{new Date(load.StartDate).toLocaleDateString()}</Text>
        <Text style={{width: '15rem', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.Trucks?.Notes ?? 'N/A'}</Text>
        <Text style={{width: '25rem', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.LoadTypes?.Description ?? 'N/A'}</Text>
        <Text style={{width: '35rem', textAlign: 'left', ...styles.padding, ...styles.text}}>{load.DeliveryLocations?.Description ?? 'N/A'}</Text>
        <Text style={{width: '5rem', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.Weight?.toString()}</Text>
        <Text style={{width: '5rem', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.Hours?.toString()}</Text>
        <Text style={{width: '5rem', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>{load.TotalRate?.toString()}</Text>
        <Text style={{width: '5rem', textAlign: 'right', ...styles.text, paddingRight: 5}}>{load.TotalAmount?.toString()}</Text>
    </View>
)

export default TableRow