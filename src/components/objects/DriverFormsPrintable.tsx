import React from "react";
import {Document, Page, StyleSheet, Text, View} from "@react-pdf/renderer";
import {
    collectEntityTrucks,
    driverMissingRequiredForm,
    entityDistinctTruckCount,
    groupOoDriversByEntity,
    isFormSatisfiedForDriver,
    isFormSatisfiedForOoEntity,
    isOoFormRequired,
    ooEntityMissingRequiredForm,
    ooEntityTrucksVitalOk,
    primaryDriverIdForEntity,
    truckOoVitalsOk,
    type DriverComplianceShape,
    type FormOptionComplianceShape,
} from "../../utils/driverFormCompliance";
import type {Carriers, Drivers, FormExpiryCadence, States, Trucks} from "@prisma/client";

export type FormOptionForPdf = {
    ID: number;
    Form: number;
    W2Visible: boolean;
    OOVisible: boolean;
    W2Required: boolean;
    OORequired: boolean;
    FleetWide: boolean;
    ExpiryCadence: FormExpiryCadence;
    ValidityMonths: number | null;
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
    entityBlock: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        paddingBottom: 8,
    },
    entityTitle: {
        fontSize: 9,
        fontWeight: "bold",
        marginBottom: 2,
    },
    entityLine: {
        fontSize: 7,
        marginBottom: 1,
    },
    truckLine: {
        fontSize: 7,
        marginLeft: 8,
        marginBottom: 1,
    },
    row: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        alignItems: "stretch",
    },
    cell: {
        padding: 1,
        borderRightWidth: 1,
        borderRightColor: "#eee",
        flexGrow: 1,
        flexBasis: 0,
    },
    cellNarrow: {
        padding: 1,
        borderRightWidth: 1,
        borderRightColor: "#eee",
        width: 36,
        textAlign: "center",
    },
    cellName: {
        padding: 1,
        borderRightWidth: 1,
        borderRightColor: "#eee",
        width: 160,
    },
    header: {
        flexDirection: "row",
        borderBottomWidth: 2,
        borderBottomColor: "#333",
        backgroundColor: "#f0f0f0",
    },
});

type DriverRow = Drivers & {
    DriverForms: {
        Form: number;
        Expiration: Date | null;
        Created: Date;
        CarrierID?: number | null;
        Filer?: string | null;
    }[];
    TrucksDriven?: { TruckID: number; Trucks: (Trucks & { LicensedIn?: States | null }) | null }[];
    Carriers?: (Carriers & { States: States | null }) | null;
    States?: States | null;
};

function formatDriverAddress(d: DriverRow): string {
    const abbr = d.States?.Abbreviation ?? "";
    const cityLine = [d.City, abbr, d.ZIP].filter((x) => x && String(x).trim()).join(" ");
    return [d.Street, cityLine].filter((x) => x && String(x).trim()).join(" · ");
}

function formatCarrierAddress(c: Carriers & { States: States | null }): string {
    const abbr = c.States?.Abbreviation ?? "";
    const cityLine = [c.City, abbr, c.ZIP].filter((x) => x && String(x).trim()).join(" ");
    return [c.Street, cityLine].filter((x) => x && String(x).trim()).join(" · ");
}

function buildShapes(drivers: DriverRow[]): DriverComplianceShape[] {
    return drivers.map((d) => ({
        ID: d.ID,
        CarrierID: d.CarrierID,
        OwnerOperator: d.OwnerOperator,
        DriverForms: d.DriverForms.map((df) => ({
            Form: df.Form,
            Expiration: df.Expiration,
            Created: df.Created,
            CarrierID: df.CarrierID ?? null,
            Filer: df.Filer ?? null,
        })),
        TrucksDriven: d.TrucksDriven,
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
    const compareLabels = (a: string, b: string): number =>
        a.localeCompare(b, undefined, {sensitivity: "base"});

    const formOptionsPdf = allForms
        .filter((f) => f.IncludeInPdf)
        .filter((f) => (mode === "w2" ? f.W2Visible : f.OOVisible))
        .slice()
        .sort((a, b) => {
            const na = (a.Forms.DisplayName || a.Forms.Name).toLowerCase();
            const nb = (b.Forms.DisplayName || b.Forms.Name).toLowerCase();
            const cmp = na.localeCompare(nb);
            return cmp !== 0 ? cmp : a.Form - b.Form;
        });

    const optShapes: FormOptionComplianceShape[] = formOptionsPdf.map((f) => ({
        Form: f.Form,
        FleetWide: f.FleetWide,
        ExpiryCadence: f.ExpiryCadence,
        ValidityMonths: f.ValidityMonths ?? null,
        W2Visible: f.W2Visible,
        OOVisible: f.OOVisible,
        W2Required: f.W2Required,
        OORequired: f.OORequired,
    }));

    const dShapes = buildShapes(drivers);

    if (mode === "w2") {
        return (
            <Document>
                <Page size="LETTER" orientation="landscape" style={styles.page}>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.header}>
                        <Text style={styles.cellNarrow}>Done</Text>
                        <Text style={styles.cellName}>Name / TIN / address / phone</Text>
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
                            "w2",
                        );
                        const done = !formsBad;
                        const nameLine1 =
                            `${d.FirstName ?? ""} ${d.LastName ?? ""}`.trim() || "—";
                        const tinLine = d.TIN?.trim() ? `TIN ${d.TIN}` : "SSN / TIN";
                        const addr = formatDriverAddress(d) || "—";
                        const phone = d.Phone?.trim() || "—";

                        return (
                            <View key={d.ID} style={styles.row} wrap={false}>
                                <Text style={styles.cellNarrow}>{done ? "X" : ""}</Text>
                                <View style={styles.cellName}>
                                    <Text>{nameLine1}</Text>
                                    <Text>{tinLine}</Text>
                                    <Text>{addr}</Text>
                                    <Text>{phone}</Text>
                                </View>
                                {formOptionsPdf.map((f) => {
                                    const fShape = optShapes.find((o) => o.Form === f.Form)!;
                                    const ok = isFormSatisfiedForDriver(shape, fShape, dShapes);
                                    const visible = f.W2Visible;
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
    }

    const ooDrivers = drivers.filter((d) => d.OwnerOperator);
    const entityMap = groupOoDriversByEntity(ooDrivers);
    const entityEntries = Array.from(entityMap.entries()).sort((a, b) => {
        const aLead = a[1][0];
        const bLead = b[1][0];
        const aLabel =
            aLead?.Carriers?.Name?.trim() ||
            `${aLead?.FirstName ?? ""} ${aLead?.LastName ?? ""}`.trim() ||
            "";
        const bLabel =
            bLead?.Carriers?.Name?.trim() ||
            `${bLead?.FirstName ?? ""} ${bLead?.LastName ?? ""}`.trim() ||
            "";
        const byLabel = compareLabels(aLabel, bLabel);
        if (byLabel !== 0) return byLabel;
        return (aLead?.ID ?? 0) - (bLead?.ID ?? 0);
    });

    return (
        <Document>
            <Page size="LETTER" orientation="landscape" style={styles.page}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.header}>
                    <Text style={styles.cellNarrow}>Done</Text>
                    <Text style={styles.cellName}>Entity / trucks</Text>
                    {formOptionsPdf.map((f) => (
                        <Text key={f.ID} style={styles.cell}>
                            {f.PdfColumnLabel?.trim() || f.Forms.DisplayName}
                        </Text>
                    ))}
                    <Text style={styles.cell}>Pay</Text>
                </View>
                {entityEntries.map(([entityKey, entityDrivers]) => {
                    const primaryId = primaryDriverIdForEntity(entityDrivers);
                    const primary = entityDrivers.find((d) => d.ID === primaryId)!;
                    const carrier = primary.Carriers ?? null;
                    const entityShapes = entityDrivers.map((d) => dShapes.find((s) => s.ID === d.ID)!);
                    const entityCarrierId = primary.CarrierID ?? null;
                    const truckCount = entityDistinctTruckCount(entityDrivers);
                    const trucksMap = collectEntityTrucks(entityDrivers);
                    const formsBad = ooEntityMissingRequiredForm(
                        entityShapes,
                        optShapes,
                        truckCount,
                        entityCarrierId,
                    );
                    const trucksBad = !ooEntityTrucksVitalOk(entityDrivers);
                    const done = !formsBad && !trucksBad;

                    const headerLines: string[] = [];
                    if (carrier) {
                        headerLines.push(carrier.Name);
                        if (carrier.ContactName?.trim()) headerLines.push(carrier.ContactName);
                        const ca = formatCarrierAddress(carrier);
                        if (ca) headerLines.push(ca);
                        if (carrier.Phone?.trim()) headerLines.push(carrier.Phone);
                    } else {
                        headerLines.push(
                            `${primary.FirstName ?? ""} ${primary.LastName ?? ""}`.trim() ||
                                "Operator",
                        );
                        const da = formatDriverAddress(primary);
                        if (da) headerLines.push(da);
                        if (primary.Phone?.trim()) headerLines.push(primary.Phone);
                    }

                    return (
                        <View key={entityKey} wrap={false}>
                            <View style={styles.entityBlock}>
                                {headerLines.map((line, i) => (
                                    <Text
                                        key={i}
                                        style={i === 0 ? styles.entityTitle : styles.entityLine}
                                    >
                                        {line}
                                    </Text>
                                ))}
                                {Array.from(trucksMap.entries()).map(([tid, t]) => (
                                    <Text key={tid} style={styles.truckLine}>
                                        Truck: {t.Name} · Plate {t.LicensePlate?.trim() || "—"} ·{" "}
                                        {truckOoVitalsOk(t) ? "OK" : "INCOMPLETE"}
                                    </Text>
                                ))}
                                {trucksMap.size === 0 ? (
                                    <Text style={styles.truckLine}>No trucks on file.</Text>
                                ) : null}
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.cellNarrow}>{done ? "X" : ""}</Text>
                                <View style={styles.cellName}>
                                    {/*<Text>{headerLines[0] ?? "—"}</Text>*/}
                                    {carrier ? (
                                        <Text style={{fontSize: 8}}>
                                            Drivers:{" "}
                                            {entityDrivers
                                                .map(
                                                    (d) =>
                                                        `${d.FirstName ?? ""} ${d.LastName ?? ""}`.trim(),
                                                )
                                                .join(", ")}
                                        </Text>
                                    ) : null}
                                </View>
                                {formOptionsPdf.map((f) => {
                                    const fShape = optShapes.find((o) => o.Form === f.Form)!;
                                    const ok = isFormSatisfiedForOoEntity(
                                        entityShapes,
                                        entityCarrierId,
                                        fShape,
                                    );
                                    const visible = f.OOVisible;
                                    const cell = !visible ? "N/A" : ok ? "X" : "";
                                    return (
                                        <Text key={f.ID} style={styles.cell}>
                                            {cell}
                                        </Text>
                                    );
                                })}
                                <Text style={styles.cell}>{primary.PayMethod?.trim() || ""}</Text>
                            </View>
                        </View>
                    );
                })}
            </Page>
        </Document>
    );
};

export default DriverFormsPrintable;
