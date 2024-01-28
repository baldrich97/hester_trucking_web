import React from 'react';
import {Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({

    container:{
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
        alignItems: 'center'
    },
    text:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 14,
        fontFamily: 'Times-Bold'
    },
    textLarge:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 16,
        fontFamily: 'Times-BoldItalic'
    },
});


const Disclaimer = () => (
    <View style={styles.container}>
        <Text style={styles.text}>A 1 1/2% FINANCE CHARGE (18% ANNUAL PERCENTAGE RATE) WILL BE ADDED TO ACCOUNTS WHICH ARE NOT PAID BY THE 30TH OF THE MONTH FOLLOWING THE DATE OF PURCHASE WITH A 50 CENTS MINIMUM CHARGE</Text>
        <Text style={styles.textLarge}>WE ACCEPT CREDIT CARDS</Text>
        <Image src={'./public/cards.jpg'} style={{width: 300, height: 50}}/>
    </View>
)

export default Disclaimer