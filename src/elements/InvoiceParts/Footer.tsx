import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';
import {CompleteCustomers} from "../../../prisma/zod";

const styles = StyleSheet.create({

    container:{
        flexDirection: 'column',
        width: '100%',
        display: 'flex'
    },
    text:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 16,
        fontWeight: 550,
    },
    body:{
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between'
    },
    textLarge:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 20,
        fontWeight: 900,
    },
    textMedium:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 20,
        fontWeight: 900,
    },
});


const Footer = ({invoiceDate, invoiceNumber, customer, total}: {invoiceDate: string, invoiceNumber: string, customer: CompleteCustomers, total: number}) => (
    <View style={styles.container}>
        <Text style={{...styles.textLarge}}>Detach here and return with payment - Thank you for your business!</Text>
        <br/>
        <View style={styles.body}>
            <View style={{width: '100%', flexDirection: 'column', display: 'flex'}}>
                <Text style={{textAlign: 'left', ...styles.textMedium}}>Invoice Date: {invoiceDate}</Text>
                <Text style={{textAlign: 'left', ...styles.text}}>Bill To: {customer.Name}</Text>
                <Text style={{textAlign: 'left', paddingLeft: '3.6rem', ...styles.text}}>{customer.Street}</Text>
                <Text style={{textAlign: 'left', paddingLeft: '3.6rem', ...styles.text}}>{customer.City}, {customer.States.Abbreviation} {customer.ZIP}</Text>
                <br/>
                <Text style={{textAlign: 'left', ...styles.textLarge}}>Payment Due: ${total}</Text>
            </View>

            <View style={{width: '100%', flexDirection: 'column', display: 'flex'}}>
                <Text style={{textAlign: 'right', ...styles.textMedium}}>Invoice Number: {invoiceNumber}</Text>
                <Text style={{textAlign: 'right', paddingRight: '3rem', ...styles.text}}>Make Payment To: Hester Trucking, Inc.</Text>
                <Text style={{textAlign: 'right', paddingRight: '6.9rem', ...styles.text}}>9570 Hwy 51</Text>
                <Text style={{textAlign: 'right', paddingRight: '3.4rem', ...styles.text}}>Broseley, MO 63932</Text>
                <br/>
                <View style={{flexDirection: 'row', display: 'flex', width: '100%', justifyContent: 'flex-end'}}>
                    <Text style={styles.textLarge}>Amount Enclosed:&nbsp;&nbsp;</Text>
                    <div style={{height: '2rem', width: '20rem', outlineStyle: 'solid', outlineColor: 'black', outlineWidth: 1}}/>
                </View>
            </View>
        </View>
        <br/>

    </View>
)

export default Footer