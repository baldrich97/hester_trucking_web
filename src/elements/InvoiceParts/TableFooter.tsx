import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({

    container:{
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-end'
    },
    text:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 18,
        fontWeight: 600
    },
});


const TableFooter = ({total}: {total: number}) => (
    <View style={styles.container}>
        <Text style={styles.text}>Grand Total: {total.toString()}</Text>
    </View>
)

export default TableFooter