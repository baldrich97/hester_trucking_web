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
        <Text style={styles.title}>Hester Trucking Inc.</Text>
        {/*<Html>{html}</Html>*/}
        <Text style={styles.subtitle}>9570 Hwy 51 - Broseley, MO 63932</Text>
        {/*<Html>{html}</Html>*/}
        <Text style={styles.subtitle}>Office: (573) 328-1160 - Fax: (573) 328-1184</Text>
        {isConsolidated && <Text style={{...styles.subtitle, fontFamily: 'Times-Italic'}}>This is a consolidated invoice, it includes other outstanding invoices.</Text>}
    </View>
)

export default Title