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
    firstLine:{
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between'
    }
});


const Header = ({invoiceDate, invoiceNumber, customer}: {invoiceDate: string, invoiceNumber: string, customer: CompleteCustomers}) => (
    <View style={styles.container}>
        <View style={styles.firstLine}>
            <Text style={styles.text}>Invoice Date: {invoiceDate}</Text>
            <Text style={styles.text}>Invoice Number: {invoiceNumber}</Text>
        </View>
        <br/>
        <Text style={{textAlign: 'left', ...styles.text}}>Bill To: {customer.Name}</Text>
        <Text style={{textAlign: 'left', paddingLeft: '3.6rem', ...styles.text}}>{customer.Street}</Text>
        <Text style={{textAlign: 'left', paddingLeft: '3.6rem', ...styles.text}}>{customer.City}, {customer.States.Abbreviation} {customer.ZIP}</Text>
    </View>
)

export default Header