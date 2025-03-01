import React from 'react';
import {View, StyleSheet, Text} from '@react-pdf/renderer';
import {
    CompleteInvoices,
    CompleteJobs,
    CompleteLoads,
    CompleteWeeklies,
    DriversModel, JobsModel,
    PayStubsModel
} from "../../../prisma/zod";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import TableFooter from "./TableFooter";
import BlankRow from "./BlankRow";
import {z} from "zod";
import Html from "react-pdf-html";
import ReactDOMServer from "react-dom/server";

type PayStubsType = z.infer<typeof PayStubsModel>;

const styles = StyleSheet.create({

    container: {
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
        padding: 0,
        margin: 0,
        lineHeight: .9
    },
    text: {
        color: 'black',
        letterSpacing: 0,
        fontSize: 11,
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 0,
        paddingTop: 2
    },
    leftAlignNoPadding: {
        textAlign: 'center',
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
    },
    padding: {
        borderRight: 2,
        borderRightStyle: 'solid',
        borderRightColor: 'black',
    }
});

const linebreak = <br/>;
const linebreakhtml = ReactDOMServer.renderToStaticMarkup(linebreak);

const Table = ({jobs, payStub}: { jobs: any[], payStub: PayStubsType }) => {
    return (
        <View style={styles.container}>
            <TableHeader/>
            {jobs.map((job, index) =>
                <TableRow job={job} key={index}/>
            )}

            {Array.from({length: 18 - jobs.length}, (_, index) => (
                <BlankRow key={index}/>
            ))}

            <TableFooter payStub={payStub}/>
            <View style={{
                flexDirection: 'row',
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-end', margin: 0, padding: 0, lineHeight: .9
            }}>
                <Text style={{
                    width: '12.65%',
                    textAlign: 'right', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1.5,
                    borderLeftWidth: 1.5,
                    borderRightWidth: 1.5,
                    borderColor: 'black',
                }}>Less:</Text>
                <Text style={{
                    width: '15.15%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1.5,
                    borderRightWidth: 1.5,
                    borderColor: 'black',
                }}>{payStub.Percentage ? payStub.Percentage : null}%</Text>
            </View>
            <View style={{
                flexDirection: 'row',
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-end', margin: 0, padding: 0, lineHeight: .9
            }}>
                <Text style={{
                    width: '12.65%',
                    textAlign: 'right', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1.5,
                    borderLeftWidth: 1.5,
                    borderRightWidth: 1.5,
                    borderColor: 'black',
                }}>TOTAL </Text>
                <Text style={{
                    width: '15.15%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1.5,
                    borderRightWidth: 1.5,
                    borderColor: 'black',
                }}>{payStub.NetTotal}</Text>
            </View>


          {/*  <Html>{linebreakhtml}</Html>*/}

            <View style={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
                <View style={{ width: '72.25%', alignItems: 'center' }}>
                    {/* Label for the Notes field */}
                    <Text style={{ ...styles.text, textAlign: 'left', marginBottom: 4 }}>
                        Relevant Notes
                    </Text>

                    {/* Notes Text field */}
                    <Text style={{
                        ...styles.text,
                        width: '95%',
                        borderWidth: 1,
                        borderColor: 'black',
                        textAlign: 'left',
                        alignSelf: 'flex-start', // aligns the text to the top within the parent view
                    }}>
                        {payStub.Notes}
                    </Text>
                </View>


                <View style={{
                    flexDirection: 'column',
                    width: '27.75%', // Width of the parent container, adjust as needed
                    justifyContent: 'flex-end',
                    display: 'flex',
                    margin: 0,
                    padding: 0,
                }}>

                    {/* ADD row */}
                    <View style={{width: '100%', display: 'flex', flexDirection: 'row'}}>
                        <View style={{
                            width: '45.5%',
                            borderColor: 'black',
                            borderBottomWidth: 1,
                            borderLeftWidth: 1,
                            borderRightWidth: 1,
                            borderTopWidth: 1,
                            textAlign: 'center'
                        }}>
                            <Text style={{...styles.text}}>ADD:</Text>
                        </View>
                        <View style={{
                            width: '54.5%',
                            borderColor: 'black',
                            borderBottomWidth: 1,
                            borderRightWidth: 1,
                            borderTopWidth: 1,
                            textAlign: 'center'
                        }}>
                            <Text style={{...styles.text}}>{payStub.Additions}</Text>
                        </View>
                    </View>

                    {/* DEDUCT row */}
                    <View style={{width: '100%', display: 'flex', flexDirection: 'row'}}>
                        <View style={{
                            width: '45.5%',
                            borderColor: 'black',
                            borderBottomWidth: 1,
                            borderLeftWidth: 1,
                            borderRightWidth: 1,
                            textAlign: 'center'
                        }}>
                            <Text style={{...styles.text}}>DEDUCT:</Text>
                        </View>
                        <View style={{
                            width: '54.5%',
                            borderColor: 'black',
                            borderBottomWidth: 1,
                            borderRightWidth: 1,
                            textAlign: 'center'
                        }}>
                            <Text style={{...styles.text}}>{payStub.Deductions}</Text>
                        </View>
                    </View>

                    {/* NET TOTAL row */}
                    <View style={{width: '100%', display: 'flex', flexDirection: 'row'}}>
                        <View style={{
                            width: '45.5%',
                            backgroundColor: '#D5DAB8',
                            borderColor: 'black',
                            borderBottomWidth: 1,
                            borderLeftWidth: 1,
                            borderRightWidth: 1,
                            textAlign: 'center'
                        }}>
                            <Text style={{...styles.text}}>NET TOTAL:</Text>
                        </View>
                        <View style={{
                            width: '54.5%',
                            backgroundColor: '#D5DAB8',
                            borderColor: 'black',
                            borderBottomWidth: 1,
                            borderRightWidth: 1,
                            textAlign: 'center'
                        }}>
                            <Text style={{...styles.text}}>{payStub.TakeHome}</Text>
                        </View>
                    </View>
                </View>
            </View>


        </View>
    )
}

export default Table