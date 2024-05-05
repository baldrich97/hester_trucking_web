import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({

    titleContainer:{
        flexDirection: 'row',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'space-between',
        width: '100%',
        top: -10
    },
    title:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 16,
        fontFamily: 'Times-Bold'
    }
});

const Title = ({customer, week, material, location} : {customer: string, week: string, material: string, location: string}) => (
    <View style={styles.titleContainer}>
        <Text style={styles.title}>{week}</Text>
        <Text style={styles.title}>{customer}</Text>
        <Text style={styles.title}>{material}</Text>
        <Text style={styles.title}>{location}</Text>
    </View>
)

export default Title