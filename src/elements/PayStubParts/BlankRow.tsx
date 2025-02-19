import {StyleSheet, Text, View} from "@react-pdf/renderer";
import React from "react";

const BlankRow = ({key}: { key: number }) => {

    const styles = StyleSheet.create({

        container: {
            flexDirection: 'row',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            borderStyle: 'solid',
            borderBottomWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: 'black',
            margin: 0,
            padding: 0,
            lineHeight: .9
        },
        text: {
            color: 'white',
            //letterSpacing: 0,
            fontSize: 11,
            padding: 0
        },
        leftAlignNoPadding: {
            textAlign: 'center',
            borderRight: 1,
            borderRightStyle: 'solid',
            borderRightColor: 'black',
        },
        padding: {
            borderRight: 1,
            borderRightStyle: 'solid',
            borderRightColor: 'black',
            //paddingLeft: 2,
        }
    });

return (
    <View style={styles.container} key={'blank-row-' + key}>
        <Text style={{
            width: '12%', ...styles.leftAlignNoPadding, ...styles.text,
        }}>TEST</Text>
        <Text style={{
            width: '50.5%',
            textAlign: 'center', ...styles.padding, ...styles.text
        }}>TEST</Text>
        <Text style={{
            width: '10%',
            textAlign: 'center', ...styles.padding, ...styles.text
        }}>TEST</Text>
        <Text style={{
            width: '12.5%',
            textAlign: 'center', ...styles.padding, ...styles.text,
        }}>TEST</Text>
        <Text style={{
            width: '15%',
            textAlign: 'center', ...styles.padding, ...styles.text,
        }}>TEST</Text>
    </View>
)}

export default BlankRow