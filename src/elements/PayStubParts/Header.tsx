import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
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
    },
    label: {
        fontSize: 12,
    },
    data: {
        fontSize: 12,
        marginBottom: 0, // Space between data and underline
        textAlign: 'left',
        textDecoration: 'underline',
    },
    underline: {
        fontSize: 12,
        textDecoration: 'underline',
        color: 'gray',
        width: '100%', // Make underline take the full width of the column
        textAlign: 'left', // Align text to the left for the underline
    },
});

// Header Component
const Header = ({ driver, invoiceDate, checkNumber }: { driver: string; invoiceDate: string; checkNumber: string }) => (
    <View style={styles.container}>
        <View style={styles.innerContainer}>
            <View style={styles.column}>
                <Text style={styles.label}>Driver:</Text>
                <Text style={styles.data}>{driver}</Text>
                <Text style={styles.underline}>_____________________________</Text>
            </View>

            <View style={styles.column}>
                <Text style={styles.label}>Invoice Date:</Text>
                <Text style={styles.data}>{invoiceDate}</Text>
                <Text style={styles.underline}>_____________________</Text>
            </View>
        </View>

        <View style={styles.innerContainer}>
            <View style={styles.column}>
                <Text style={styles.label}>Check#:</Text>
                <Text style={styles.data}>{checkNumber}</Text>
                <Text style={styles.underline}>_____________________________</Text>
            </View>
        </View>
    </View>
);

export default Header;
