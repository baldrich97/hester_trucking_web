import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';
import { boolean } from 'zod';

const styles = StyleSheet.create({

    titleContainer:{
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        backgroundColor: '#D5DAB8',
        width: '100%',
    },
    title:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 24,
        fontFamily: 'Times-Bold'
    },
    subtitle:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 12,
        fontFamily: 'Times-Roman',
        lineHeight: 1.5
    }
});

const Title = () => (
    <View style={styles.titleContainer}>
        <Text style={styles.title}>Hester Trucking Inc.</Text>
        <Text style={styles.subtitle}>9570 HIGHWAY 51 BROSELEY, MO 63932</Text>
        <Text style={styles.subtitle}>MO DOT 43115   US DOT 866500</Text>
        <Text style={styles.subtitle}>(PH) 573-328-1160   (Email) jhestertrucking@yahoo.com</Text>
    </View>
)

export default Title