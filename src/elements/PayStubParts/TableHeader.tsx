import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        borderStyle: 'solid',
        borderColor: 'black',
        borderWidth: 2,
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 11,
        fontFamily: 'Times-Bold'
    },
    leftAlignNoPadding: {
        textAlign: 'center',
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
    },
    padding: {
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
    }
});


const TableHeader = () => (
    <View style={styles.container}>
        <Text style={{width: '12%', ...styles.leftAlignNoPadding, ...styles.text}}>Date</Text>
        <Text style={{width: '50.5%', textAlign: 'center', ...styles.padding, ...styles.text}}>Description</Text>
        <Text style={{width: '10%', textAlign: 'center', ...styles.padding, ...styles.text}}>Tons</Text>
        <Text style={{width: '12.5%', textAlign: 'center', ...styles.text, ...styles.padding}}>Rate</Text>
        <Text style={{width: '15%', textAlign: 'center', ...styles.text, ...styles.padding, borderRight: 0}}>Amount</Text>
    </View>
)

export default TableHeader