import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';
import { boolean } from 'zod';

const styles = StyleSheet.create({

    titleContainer:{
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center'
    },
    title:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 30,
        fontFamily: 'Times-Bold'
    },
    subtitle:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 16,
        fontFamily: 'Times-Roman'
    }
});

const Title = ({isConsolidated = false} : {isConsolidated: boolean}) => (
    <View style={styles.titleContainer}>
        <Text style={styles.title}>Aldrich Software, Inc.</Text>
        {/*<Html>{html}</Html>*/}
        <Text style={styles.subtitle}>123 South Street - Springfield, MO 65807</Text>
        {/*<Html>{html}</Html>*/}
        <Text style={styles.subtitle}>Office: (555) 123-4567 - Fax: (555) 789-1011</Text>
        {isConsolidated && <Text style={{...styles.subtitle, fontFamily: 'Times-Italic'}}>This is a consolidated invoice, it includes other outstanding invoices.</Text>}
    </View>
)

export default Title