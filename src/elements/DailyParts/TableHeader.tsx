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
        borderBottom: 2,
        borderBottomStyle: "solid",
        borderBottomColor: 'black'
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 11,
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
        minHeight: 36,
        maxHeight: 36
    }
});


const TableHeader = () => (
    <View style={styles.container}>
            <Text style={{width: '5%', ...styles.leftAlignNoPadding, ...styles.text, minHeight: 36, maxHeight: 36}}>Date</Text>
            <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}>Material</Text>
            <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}>Receiver</Text>
            <Text style={{width: '20%', textAlign: 'center', ...styles.padding, ...styles.text}}>Destination</Text>
            <Text style={{width: '17.5%', textAlign: 'center', ...styles.padding, ...styles.text}}>Ticket#</Text>
            <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5}}>Company Rate</Text>
            <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5}}>Trucking Rate</Text>
            <Text style={{width: '12.5%', textAlign: 'center', ...styles.padding, ...styles.text, paddingRight: 5}}>Weight</Text>
            <View style={{flexDirection: 'column', width: '30%', display: 'flex', maxHeight: 36}}>
                <Text style={{width: '100%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 9, minHeight: 18, maxHeight: 18, borderRight: 0}}>Total Revenue</Text>
                <View style={{display: 'flex', flexDirection: 'row', width: '100%', borderTop: 2, borderTopStyle: 'solid', borderTopColor: 'black', borderRight: 0}}>
                    <Text style={{width: '50%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 9, borderRight: 2, borderRightStyle: 'solid', borderRightColor: 'black', minHeight: 15, maxHeight: 18}}>Company Rate</Text>
                    <Text style={{width: '50%', textAlign: 'center', ...styles.padding, ...styles.text, fontSize: 9, minHeight: 15, maxHeight: 18, borderRight: 0}}>Trucking Rate</Text>
                </View>
            </View>
    </View>
)

export default TableHeader