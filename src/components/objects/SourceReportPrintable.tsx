import React from "react";
import {Document, Font, Page, StyleSheet, Text, View} from "@react-pdf/renderer";

type ReportRow = {
    ID: number;
    StartDate: Date;
    TicketNumber: number;
    Weight: number;
    TotalAmount: number;
    TotalRate: number;
    LoadType: string;
    Customer: string;
    DeliveryLocation: string;
};

type ReportSummaryRow = {
    loadType: string;
    totalLoads: number;
    totalTonnage: number;
    totalAmount: number;
};

type SourceReportPrintableProps = {
    sourceName: string;
    startDate: string;
    endDate: string;
    rows: ReportRow[];
    summary: {
        totalLoads: number;
        totalTonnage: number;
        totalAmount: number;
        byLoadType: ReportSummaryRow[];
    };
};

Font.register({
    family: "Nunito",
    fonts: [
        {src: "https://fonts.gstatic.com/s/nunito/v8/kpI87QY2ce-mk2ZnKb-r0g.ttf"},
        {src: "https://fonts.gstatic.com/s/nunito/v8/B4-BGlpEzQ4WP-D3Zi0PRQ.ttf", fontWeight: 600},
    ],
});

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 10,
        fontFamily: "Nunito",
    },
    title: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: 700,
    },
    subtitle: {
        marginBottom: 2,
    },
    sectionTitle: {
        marginTop: 12,
        marginBottom: 6,
        fontSize: 12,
        fontWeight: 700,
    },
    summaryRow: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 8,
    },
    summaryBox: {
        border: 1,
        borderColor: "#bbb",
        borderStyle: "solid",
        borderRadius: 4,
        padding: 6,
        minWidth: 130,
    },
    summaryLabel: {
        fontSize: 9,
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 11,
        fontWeight: 700,
    },
    table: {
        width: "100%",
        border: 1,
        borderColor: "#bbb",
        borderStyle: "solid",
        marginBottom: 8,
    },
    row: {
        flexDirection: "row",
        borderBottom: 1,
        borderBottomColor: "#ddd",
        borderBottomStyle: "solid",
    },
    headerRow: {
        backgroundColor: "#f2f2f2",
    },
    cell: {
        padding: 4,
        borderRight: 1,
        borderRightColor: "#ddd",
        borderRightStyle: "solid",
    },
    cellLast: {
        borderRightWidth: 0,
    },
    alignRight: {
        textAlign: "right",
    },
});

function money(value: number): string {
    return `$${(Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)}`;
}

function number(value: number): string {
    return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

const SourceReportPrintable = ({sourceName, startDate, endDate, rows, summary}: SourceReportPrintableProps) => {
    return (
        <Document>
            <Page size="LETTER" orientation="landscape" style={styles.page}>
                <Text style={styles.title}>Source Audit Report</Text>
                <Text style={styles.subtitle}>Source: {sourceName}</Text>
                <Text style={styles.subtitle}>Date Range: {startDate} to {endDate}</Text>

                <View style={styles.summaryRow}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Loads</Text>
                        <Text style={styles.summaryValue}>{summary.totalLoads}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Tonnage</Text>
                        <Text style={styles.summaryValue}>{number(summary.totalTonnage)}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Amount</Text>
                        <Text style={styles.summaryValue}>{money(summary.totalAmount)}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Subtotals by Load Type</Text>
                <View style={styles.table}>
                    <View style={[styles.row, styles.headerRow]}>
                        <Text style={[styles.cell, {width: "40%"}]}>Load Type</Text>
                        <Text style={[styles.cell, styles.alignRight, {width: "20%"}]}>Loads</Text>
                        <Text style={[styles.cell, styles.alignRight, {width: "20%"}]}>Tonnage</Text>
                        <Text style={[styles.cell, styles.cellLast, styles.alignRight, {width: "20%"}]}>Amount</Text>
                    </View>
                    {summary.byLoadType.length === 0 ? (
                        <View style={styles.row}>
                            <Text style={[styles.cell, styles.cellLast, {width: "100%"}]}>No rows found for this filter.</Text>
                        </View>
                    ) : (
                        summary.byLoadType.map((item, index) => (
                            <View style={styles.row} key={`summary-row-${index}`}>
                                <Text style={[styles.cell, {width: "40%"}]}>{item.loadType}</Text>
                                <Text style={[styles.cell, styles.alignRight, {width: "20%"}]}>{item.totalLoads}</Text>
                                <Text style={[styles.cell, styles.alignRight, {width: "20%"}]}>{number(item.totalTonnage)}</Text>
                                <Text style={[styles.cell, styles.cellLast, styles.alignRight, {width: "20%"}]}>{money(item.totalAmount)}</Text>
                            </View>
                        ))
                    )}
                </View>

                <Text style={styles.sectionTitle}>Detailed Rows</Text>
                <View style={styles.table}>
                    <View style={[styles.row, styles.headerRow]}>
                        <Text style={[styles.cell, {width: "10%"}]}>Date</Text>
                        <Text style={[styles.cell, {width: "9%"}]}>Ticket #</Text>
                        <Text style={[styles.cell, {width: "18%"}]}>Load Type</Text>
                        <Text style={[styles.cell, styles.alignRight, {width: "10%"}]}>Tonnage</Text>
                        <Text style={[styles.cell, styles.alignRight, {width: "10%"}]}>Rate</Text>
                        <Text style={[styles.cell, styles.alignRight, {width: "10%"}]}>Amount</Text>
                        <Text style={[styles.cell, {width: "18%"}]}>Customer</Text>
                        <Text style={[styles.cell, styles.cellLast, {width: "15%"}]}>To / Delivery</Text>
                    </View>
                    {rows.length === 0 ? (
                        <View style={styles.row}>
                            <Text style={[styles.cell, styles.cellLast, {width: "100%"}]}>No rows found for this filter.</Text>
                        </View>
                    ) : (
                        rows.map((item, index) => (
                            <View style={styles.row} key={`detail-row-${index}`} wrap={false}>
                                <Text style={[styles.cell, {width: "10%"}]}>{new Date(item.StartDate).toLocaleDateString("en-US", {timeZone: "UTC"})}</Text>
                                <Text style={[styles.cell, {width: "9%"}]}>{item.TicketNumber}</Text>
                                <Text style={[styles.cell, {width: "18%"}]}>{item.LoadType}</Text>
                                <Text style={[styles.cell, styles.alignRight, {width: "10%"}]}>{number(item.Weight)}</Text>
                                <Text style={[styles.cell, styles.alignRight, {width: "10%"}]}>{money(item.TotalRate)}</Text>
                                <Text style={[styles.cell, styles.alignRight, {width: "10%"}]}>{money(item.TotalAmount)}</Text>
                                <Text style={[styles.cell, {width: "18%"}]}>{item.Customer}</Text>
                                <Text style={[styles.cell, styles.cellLast, {width: "15%"}]}>{item.DeliveryLocation}</Text>
                            </View>
                        ))
                    )}
                </View>
            </Page>
        </Document>
    );
};

export default SourceReportPrintable;
