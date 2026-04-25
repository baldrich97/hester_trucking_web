import React from "react";
import {Document, Page, StyleSheet, Text, View} from "@react-pdf/renderer";
import {
    driverMissingRequiredForm,
    isFormSatisfiedForDriver,
    ooDriverTrucksVitalOk,
    type DriverComplianceShape,
    type FormOptionComplianceShape,
} from "../../utils/driverFormCompliance";
import type {Drivers, FormExpiryCadence, Trucks} from "@prisma/client";

export type FormOptionForPdf = {
    ID: number;
    Form: number;
    W2Visible: boolean;
    OOVisible: boolean;
    W2Required: boolean;
    OORequired: boolean;
    CarrierWide: boolean;
    ExpiryCadence: FormExpiryCadence;
    ValidityMonths: number | null;
    PdfOrder: number;
    PdfColumnLabel: string | null;
    IncludeInPdf: boolean;
    Forms: { Name: string; DisplayName: string };
};

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontSize: 8,
    },
    title: {
        fontSize: 12,
        marginBottom: 10,
    },
    row: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        alignItems: "stretch",
    },
    cell: {
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: "#eee",
        flexGrow: 1,
        flexBasis: 0,
    },
    cellNarrow: {
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: "#eee",
        width: 36,
        textAlign: "center",
    },
    cellName: {
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: "#eee",
        width: 140,
    },
    header: {
        flexDirection: "row",
        borderBottomWidth: 2,
        borderBottomColor: "#333",
        backgroundColor: "#f0f0f0",
    },
});

type DriverRow = Drivers & {
    DriverForms: { Form: number; Expiration: Date | null; Created: Date }[];
    TrucksDriven?: { TruckID: number; Trucks: Trucks | null }[];
};

function buildShapes(drivers: DriverRow[]): DriverComplianceShape[] {
    return drivers.map((d) => ({
        ID: d.ID,
        CarrierID: d.CarrierID,
        OwnerOperator: d.OwnerOperator,
        DriverForms: d.DriverForms.map((df) => ({
            Form: df.Form,
            Expiration: df.Expiration,
            Created: df.Created,
        })),
    }));
}

const DriverFormsPrintable = ({
    title,
    mode,
    drivers,
    allForms,
}: {
    title: string;
    mode: "w2" | "oo";
    drivers: DriverRow[];
    allForms: FormOptionForPdf[];
}) => {
    const formOptionsPdf = allForms
        .filter((f) => f.IncludeInPdf)
        .filter((f) => (mode === "w2" ? f.W2Visible : f.OOVisible));

    const optShapes: FormOptionComplianceShape[] = formOptionsPdf.map((f) => ({
        Form: f.Form,
        CarrierWide: f.CarrierWide,
        ExpiryCadence: f.ExpiryCadence,
        ValidityMonths: f.ValidityMonths ?? null,
        W2Visible: f.W2Visible,
        OOVisible: f.OOVisible,
        W2Required: f.W2Required,
        OORequired: f.OORequired,
    }));

    const dShapes = buildShapes(drivers);

    return (
        <Document>
            <Page size="LETTER" orientation="landscape" style={styles.page}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.header}>
                    <Text style={styles.cellNarrow}>Done</Text>
                    <Text style={styles.cellName}>Name / TIN</Text>
                    {mode === "oo" ? <Text style={styles.cellNarrow}>Trk</Text> : null}
                    {formOptionsPdf.map((f) => (
                        <Text key={f.ID} style={styles.cell}>
                            {f.PdfColumnLabel?.trim() || f.Forms.DisplayName}
                        </Text>
                    ))}
                    <Text style={styles.cell}>Pay</Text>
                </View>
                {drivers.map((d) => {
                    const shape = dShapes.find((s) => s.ID === d.ID)!;
                    const formsBad = driverMissingRequiredForm(
                        shape,
                        optShapes,
                        dShapes,
                        mode,
                    );
                    const trucksBad =
                        mode === "oo" ? !ooDriverTrucksVitalOk(d.TrucksDriven ?? []) : false;
                    const done = !formsBad && !trucksBad;

                    const nameLine1 =
                        `${d.FirstName ?? ""} ${d.LastName ?? ""}`.trim() || "—";
                    const tinLine = d.TIN?.trim() ? `TIN ${d.TIN}` : "SSN / TIN";

                    return (
                        <View key={d.ID} style={styles.row} wrap={false}>
                            <Text style={styles.cellNarrow}>{done ? "X" : ""}</Text>
                            <View style={styles.cellName}>
                                <Text>{nameLine1}</Text>
                                <Text>{tinLine}</Text>
                            </View>
                            {mode === "oo" ? (
                                <Text style={styles.cellNarrow}>
                                    {ooDriverTrucksVitalOk(d.TrucksDriven ?? []) ? "X" : ""}
                                </Text>
                            ) : null}
                            {formOptionsPdf.map((f) => {
                                const fShape = optShapes.find((o) => o.Form === f.Form)!;
                                const ok = isFormSatisfiedForDriver(shape, fShape, dShapes);
                                const visible = mode === "w2" ? f.W2Visible : f.OOVisible;
                                const cell = !visible ? "N/A" : ok ? "X" : "";
                                return (
                                    <Text key={f.ID} style={styles.cell}>
                                        {cell}
                                    </Text>
                                );
                            })}
                            <Text style={styles.cell}>{d.PayMethod?.trim() || ""}</Text>
                        </View>
                    );
                })}
            </Page>
        </Document>
    );
};

export default DriverFormsPrintable;
