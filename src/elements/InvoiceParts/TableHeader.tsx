import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 6,
        borderStyle: 'solid',
        borderColor: 'black',
        borderWidth: 2,
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
        borderRightColor: 'black',
    },
    padding: {
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
        paddingLeft: 5,
    }
});


const TableHeader = () => (
    <View style={styles.container}>
        <Text style={{width: '10%', ...styles.leftAlignNoPadding, ...styles.text}}>Date</Text>
        <Text style={{width: '10%', textAlign: 'left', ...styles.padding, ...styles.text}}>Truck</Text>
        <Text style={{width: '25%', textAlign: 'left', ...styles.padding, ...styles.text}}>Material</Text>
        <Text style={{width: '32%', textAlign: 'left', ...styles.padding, ...styles.text}}>Location</Text>
        <Text style={{width: '8%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Weight</Text>
        <Text style={{width: '5%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Hours</Text>
        <Text style={{width: '5%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Rate</Text>
        <Text style={{width: '5%', textAlign: 'right', ...styles.text, paddingRight: 5}}>Total</Text>
    </View>
)

export default TableHeader