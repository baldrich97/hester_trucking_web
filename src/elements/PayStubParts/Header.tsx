import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
        lineHeight: 1
    },
    innerContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
        width: '100%',
    },
    column: {
        width: '48%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    label: {
        fontSize: 12,
    },
    data: {
        fontSize: 12,
        marginBottom: 0, // Space between data and underline
        textAlign: 'left',
        width: '100%',
        borderBottom: 2,
    },

});

// Header Component
const Header = ({ driver, invoiceDate, checkNumber }: { driver: string; invoiceDate: string; checkNumber: string }) => (
    <View style={styles.container}>
        <View style={styles.innerContainer}>
            <View style={styles.column}>
                <Text style={{...styles.label, marginRight: 15}}>Driver:</Text>
                <Text style={styles.data}>{driver}</Text>
            </View>

            <View style={styles.column}>
                <Text style={{...styles.label, marginRight: 25}}>Deposit Date:</Text>
                <Text style={styles.data}>{invoiceDate}</Text>
            </View>
        </View>

        <View style={styles.innerContainer}>
            <View style={styles.column}>
                <Text style={{...styles.label, marginRight: 15}}>Check#:</Text>
                <Text style={styles.data}>{checkNumber}</Text>
            </View>
        </View>
    </View>
);

export default Header;
