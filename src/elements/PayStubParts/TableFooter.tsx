import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        borderStyle: 'solid',
        borderBottomWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'black',
        margin: 0,
        padding: 0,
        lineHeight: .9
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 13,
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',

    },
    leftAlignNoPadding: {
        textAlign: 'center',
        borderRight: 1,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
    },
    padding: {
        borderRight: 1,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
    }
});


const TableFooter = ({payStub}: {payStub: any}) => (

        <View style={styles.container}>
            <Text style={{
                width: '12%', ...styles.leftAlignNoPadding, ...styles.text,
                fontSize: 9
            }}></Text>
            <Text style={{
                width: '50.5%',
                textAlign: 'center', ...styles.padding, ...styles.text
            }}>Totals</Text>
            <Text style={{
                width: '10%',
                textAlign: 'center', ...styles.padding, ...styles.text
            }}></Text>
            <Text style={{
                width: '12.5%',
                textAlign: 'center', ...styles.text, ...styles.padding
            }}></Text>
            <Text style={{
                width: '15%',
                textAlign: 'center', ...styles.text, ...styles.padding
            }}>{payStub.Gross}</Text>
        </View>

)

export default TableFooter