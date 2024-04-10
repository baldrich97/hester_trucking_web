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
        fontSize: 10,
        fontFamily: 'Times-Bold'
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
        paddingLeft: 2,
    }
});


const TableHeader = ({isConsolidated = false}: { isConsolidated: boolean }) => (
    <View style={styles.container}>
        {isConsolidated ? <>
            <Text style={{width: '8%', ...styles.leftAlignNoPadding, ...styles.text}}>Date</Text>
            <Text style={{width: '10%', textAlign: 'left', ...styles.padding, ...styles.text}}>Number</Text>
            <Text style={{width: '73%', textAlign: 'left', ...styles.padding, ...styles.text}}>Loads Included In Invoice</Text>
            <Text style={{width: '8%', textAlign: 'right', ...styles.text, paddingRight: 5}}>Total</Text>
        </> : 
        <>
            <Text style={{width: '8%', ...styles.leftAlignNoPadding, ...styles.text}}>Date</Text>
            <Text style={{width: '10%', textAlign: 'left', ...styles.padding, ...styles.text}}>Truck</Text>
            <Text style={{width: '22%', textAlign: 'left', ...styles.padding, ...styles.text}}>Material</Text>
            <Text style={{width: '25%', textAlign: 'left', ...styles.padding, ...styles.text}}>Location</Text>
            <Text style={{width: '8%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Weight</Text>
            <Text style={{width: '8%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Hours</Text>
            <Text style={{width: '8%', textAlign: 'right', ...styles.padding, ...styles.text, paddingRight: 5}}>Rate</Text>
            <Text style={{width: '10%', textAlign: 'right', ...styles.text, paddingRight: 5}}>Total</Text>
        </>}
    </View>
)

export default TableHeader