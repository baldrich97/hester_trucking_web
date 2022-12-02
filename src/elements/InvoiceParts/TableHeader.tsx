import React from 'react';
import {Text, View, StyleSheet} from '@react-pdf/renderer';

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        outlineStyle: 'solid',
        outlineWidth: 'medium',
        marginBottom: 6
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
        borderRightColor: 'black',
    },
    padding: {
        borderRight: 3,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
        paddingLeft: 5,
    }
});


const TableHeader = () => (
    <View style={styles.container}>
        <Text style={{width: '8rem', ...styles.leftAlignNoPadding, ...styles.text}}>Date</Text>
        <Text style={{width: '15rem', textAlign: 'left', ...styles.padding, ...styles.text}}>Truck</Text>
        <Text style={{width: '25rem', textAlign: 'left', ...styles.padding, ...styles.text}}>Material</Text>
        <Text style={{width: '35rem', textAlign: 'left', ...styles.padding, ...styles.text}}>Location</Text>
        <Text style={{width: '5rem', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Weight</Text>
        <Text style={{width: '5rem', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Hours</Text>
        <Text style={{width: '5rem', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Rate</Text>
        <Text style={{width: '5rem', textAlign: 'right', ...styles.text, paddingRight: 5}}>Total</Text>
    </View>
)

export default TableHeader