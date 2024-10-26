import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';

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
        fontSize: 13,
    },
    leftAlignNoPadding: {
        textAlign: 'center',
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
    },
    padding: {
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
        paddingLeft: 2,
    }
});


const TableFooter = ({payStub}: {payStub: any}) => (
    <>
        <View style={styles.container}>
            <Text style={{
                width: '10%', ...styles.leftAlignNoPadding, ...styles.text,
                fontSize: 9
            }}></Text>
            <Text style={{
                width: '55%',
                textAlign: 'center', ...styles.padding, ...styles.text
            }}>Totals</Text>
            <Text style={{
                width: '10%',
                textAlign: 'center', ...styles.padding, ...styles.text
            }}></Text>
            <Text style={{
                width: '10%',
                textAlign: 'center', ...styles.text,
                paddingRight: 5
            }}></Text>
            <Text style={{
                width: '15%',
                textAlign: 'center', ...styles.text,
                paddingRight: 5
            }}>{payStub.Gross}</Text>
        </View>
        <View style={{flexDirection: 'row',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',}}>
            <Text style={{
                width: '10%', ...styles.text,
                fontSize: 9
            }}></Text>
            <Text style={{
                width: '55%',
                textAlign: 'center', padding: 2, ...styles.text
            }}></Text>
            <Text style={{
                width: '10%',
                textAlign: 'center', padding: 2, ...styles.text
            }}></Text>
            <Text style={{
                width: '10%',
                textAlign: 'right', ...styles.text,
                paddingRight: 5,
                borderStyle: 'solid',
                borderWidth: 2,
                borderColor: 'grey',
            }}>Less:</Text>
            <Text style={{
                width: '15%',
                textAlign: 'center', ...styles.text,
                paddingRight: 5,
                borderStyle: 'solid',
                borderWidth: 2,
                borderColor: 'grey',
            }}>%{payStub.Percentage}</Text>
        </View>
        <View style={{flexDirection: 'row',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',}}>
            <Text style={{
                width: '10%', ...styles.text,
                fontSize: 9
            }}></Text>
            <Text style={{
                width: '55%',
                textAlign: 'center', padding: 2, ...styles.text
            }}></Text>
            <Text style={{
                width: '10%',
                textAlign: 'center', padding: 2, ...styles.text
            }}></Text>
            <Text style={{
                width: '10%',
                textAlign: 'right', ...styles.text,
                paddingRight: 5,
                borderStyle: 'solid',
                borderWidth: 2,
                borderColor: 'grey',
            }}>TOTAL </Text>
            <Text style={{
                width: '15%',
                textAlign: 'center', ...styles.text,
                paddingRight: 5,
                borderStyle: 'solid',
                borderWidth: 2,
                borderColor: 'grey',
            }}>{payStub.NetTotal}</Text>
        </View>
    </>
)

export default TableFooter