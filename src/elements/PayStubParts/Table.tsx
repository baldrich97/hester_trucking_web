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
                justifyContent: 'flex-end', margin: 0, padding: 0,
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
                justifyContent: 'flex-end', margin: 0, padding: 0
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


            <Html>{linebreakhtml}</Html>


            <View style={{
                flexDirection: 'row',
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-end', margin: 0, padding: 0,
            }}>
                <Text style={{
                    width: '12.75%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'black',
                }}>FED:</Text>
                <Text style={{
                    width: '15.25%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'black',
                }}>{payStub.FedTax}</Text>
            </View>
            <View style={{
                flexDirection: 'row',
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-end', margin: 0, padding: 0
            }}>
                <Text style={{
                    width: '12.75%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'black',
                }}>STATE: </Text>
                <Text style={{
                    width: '15.25%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'black',
                }}>{payStub.StateTax}</Text>
            </View>
            <View style={{
                flexDirection: 'row',
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-end', margin: 0, padding: 0,
            }}>
                <Text style={{
                    width: '12.75%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'black',
                }}>S/S:</Text>
                <Text style={{
                    width: '15.25%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'black',
                }}>{payStub.SSTax}</Text>
            </View>
            <View style={{
                flexDirection: 'row',
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-end', margin: 0, padding: 0
            }}>
                <Text style={{
                    width: '12.75%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'black',
                }}>MED: </Text>
                <Text style={{
                    width: '15.25%',
                    textAlign: 'center', ...styles.text,
                    borderStyle: 'solid',
                    borderBottomWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'black',
                }}>{payStub.MedTax}</Text>
            </View>

            <View style={{
                flexDirection: 'row',
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-end', margin: 0, padding: 0
            }}>
                <View style={{
                    flexDirection: 'row',
                    backgroundColor: '#D5DAB8',
                    width: '28%'
                }}>
                    <Text style={{
                        width: '45.5%',
                        textAlign: 'center', ...styles.text,
                        borderStyle: 'solid',
                        borderBottomWidth: 1,
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                        borderColor: 'black',
                    }}>NET TOTAL: </Text>
                    <Text style={{
                        width: '54.5%',
                        textAlign: 'center', ...styles.text,
                        borderStyle: 'solid',
                        borderBottomWidth: 1,
                        borderRightWidth: 1,
                        borderColor: 'black',
                    }}>{payStub.TakeHome}</Text>
                </View>
            </View>

        </View>
    )
}

export default Table