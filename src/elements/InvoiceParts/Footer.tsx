import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';
import {CompleteCustomers} from "../../../prisma/zod";
import ReactDOMServer from "react-dom/server";
import Html from 'react-pdf-html';

const styles = StyleSheet.create({

    container:{
        flexDirection: 'column',
        width: '100%',
        display: 'flex'
    },
    text:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 12,
        fontFamily: 'Times-Bold'
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
        fontSize: 16,
        fontFamily: 'Times-Bold'
    },
    textMedium:{
        color: 'black',
        letterSpacing: 0,
        fontSize: 14,
        fontFamily: 'Times-Bold'
    },
});

const dividerstyle = {div: {height: 20, width: 160, borderStyle: 'solid', borderColor: 'black', borderWidth: 2}}
const divider = <div/>;
const dividerhtml = ReactDOMServer.renderToStaticMarkup(divider);


const Footer = ({invoiceDate, invoiceNumber, customer, total}: {invoiceDate: string, invoiceNumber: string, customer: CompleteCustomers, total: number}) => (
    <View style={styles.container}>
        <Text style={{...styles.textLarge, fontFamily: 'Times-BoldItalic'}}>Detach here and return with payment - Thank you for your business!</Text>
        <br/>
        <View style={styles.body}>
            <View style={{width: '100%', flexDirection: 'column', display: 'flex'}}>
                <Text style={{textAlign: 'left', ...styles.textMedium}}>Invoice Date: {invoiceDate}</Text>
                <Text style={{textAlign: 'left', ...styles.text}}>Bill To: {customer.Name}</Text>
                <Text style={{textAlign: 'left', paddingLeft: 38, ...styles.text}}>{customer.Street}</Text>
                <Text style={{textAlign: 'left', paddingLeft: 38, ...styles.text}}>{customer.City}, {customer.States.Abbreviation} {customer.ZIP}</Text>
                <br/>
                <Text style={{textAlign: 'left', ...styles.textLarge}}>Payment Due: ${(Math.round((total + Number.EPSILON) * 100) / 100).toString()}</Text>
            </View>

            <View style={{width: '100%', flexDirection: 'column', display: 'flex'}}>
                <Text style={{textAlign: 'right', ...styles.textMedium}}>Invoice Number: {invoiceNumber}</Text>
                <Text style={{textAlign: 'right', ...styles.text}}>Make Payment To: Aldrich Software, Inc.</Text>
                <Text style={{textAlign: 'right', ...styles.text}}>123 South Street</Text>
                <Text style={{textAlign: 'right', ...styles.text}}>Springfield, MO 65807</Text>
                <br/>
                <View style={{flexDirection: 'row', display: 'flex', width: '100%', justifyContent: 'flex-end'}}>
                    <Text style={styles.textLarge}>Amount Enclosed:&nbsp;&nbsp;</Text>
                    <Html stylesheet={dividerstyle}>{dividerhtml}</Html>
                </View>
            </View>
        </View>
        <br/>

    </View>
)

export default Footer