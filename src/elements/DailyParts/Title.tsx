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
        fontSize: 18,
        fontFamily: 'Times-Bold'
    }
});

const Title = ({driver, week} : {driver: string, week: string}) => (
    <View style={styles.titleContainer}>
        <Text style={styles.title}>{driver}</Text>
        <Text style={styles.title}>HESTER TRUCKING DAILY LOG</Text>
        <Text style={styles.title}>{week}</Text>
    </View>
)

export default Title