import React from 'react';
import {Text, View, StyleSheet } from '@react-pdf/renderer';
import {CompleteCustomers} from "../../../prisma/zod";
import ReactDOMServer from "react-dom/server";
import Html from 'react-pdf-html';

const styles = StyleSheet.create({

    container: {
        flexDirection: 'row',
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-end',
        borderStyle: 'solid',
        borderWidth: 2,
        borderColor: 'grey',
        margin: 0,
        padding: 0
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 13,
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',

    },
    leftAlignNoPadding: {
        textAlign: 'center',
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
    },
    padding: {
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'grey',
    }
});


const Footer = ({payStub}: {payStub: any}) => (
    <View style={styles.container}>

    </View>
)

export default Footer