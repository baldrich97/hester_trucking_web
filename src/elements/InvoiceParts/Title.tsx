import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({

    titleContainer:{
        flexDirection: 'row',
    },
    title:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 30,
        fontWeight: 'bold',
    },
    subtitle:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 16,
        fontWeight: 550,
    }
});


const Title = () => (
    <View style={styles.titleContainer}>
        <Text style={styles.title}>Hester Trucking Inc.</Text>
        <br/>
        <Text style={styles.subtitle}>9570 Hwy 51 - Broseley, MO 63932</Text>
        <br/>
        <Text style={styles.subtitle}>Office (573)328-1160 - Fax (573)328-1184</Text>
    </View>
)

export default Title