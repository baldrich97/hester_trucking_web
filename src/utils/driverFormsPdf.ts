import {
    driverMissingRequiredForm,
    ooEntityMissingRequiredForm,
    ooEntityTrucksVitalOk,
    type DriverComplianceShape,
    type FormOptionComplianceShape,
} from "./driverFormCompliance";

export type FormOptionPdfInput = {
    ID: number;
    Form: number;
    W2Visible: boolean;
    OOVisible: boolean;
    W2Required: boolean;
    OORequired: boolean;
    FleetWide: boolean;
    ExpiryCadence: FormOptionComplianceShape["ExpiryCadence"];
    ValidityMonths: number | null;
    PdfColumnLabel: string | null;
    IncludeInPdf: boolean;
    Forms: { Name: string; DisplayName: string };
};

function toComplianceShape(f: FormOptionPdfInput): FormOptionComplianceShape {
    return {
        Form: f.Form,
        FleetWide: f.FleetWide,
        ExpiryCadence: f.ExpiryCadence,
        ValidityMonths: f.ValidityMonths ?? null,
        W2Visible: f.W2Visible,
        OOVisible: f.OOVisible,
        W2Required: f.W2Required,
        OORequired: f.OORequired,
    };
}

function compareFormLabels(a: FormOptionPdfInput, b: FormOptionPdfInput): number {
    const na = (a.Forms.DisplayName || a.Forms.Name).toLowerCase();
    const nb = (b.Forms.DisplayName || b.Forms.Name).toLowerCase();
    const cmp = na.localeCompare(nb);
    return cmp !== 0 ? cmp : a.Form - b.Form;
}

/** All visible form options for compliance (Done column, asterisk), regardless of PDF inclusion. */
export function visibleComplianceForms(
    allForms: FormOptionPdfInput[],
    mode: "w2" | "oo",
): FormOptionComplianceShape[] {
    return allForms
        .filter((f) => (mode === "w2" ? f.W2Visible : f.OOVisible))
        .map(toComplianceShape);
}

/** Columns printed on the PDF; required forms are always included. */
export function pdfColumnForms(
    allForms: FormOptionPdfInput[],
    mode: "w2" | "oo",
): FormOptionPdfInput[] {
    return allForms
        .filter((f) => (mode === "w2" ? f.W2Visible : f.OOVisible))
        .filter(
            (f) =>
                f.IncludeInPdf || (mode === "w2" ? f.W2Required : f.OORequired),
        )
        .slice()
        .sort(compareFormLabels);
}

export function isW2DriverDoneOnPdf(
    shape: DriverComplianceShape,
    allForms: FormOptionPdfInput[],
    allDriverShapes: DriverComplianceShape[],
): boolean {
    return !driverMissingRequiredForm(
        shape,
        visibleComplianceForms(allForms, "w2"),
        allDriverShapes,
        "w2",
    );
}

export function isOoEntityDoneOnPdf(
    entityShapes: DriverComplianceShape[],
    entityDrivers: { TrucksDriven?: DriverComplianceShape["TrucksDriven"] }[],
    truckCount: number,
    entityCarrierId: number | null | undefined,
    allForms: FormOptionPdfInput[],
): boolean {
    const formsBad = ooEntityMissingRequiredForm(
        entityShapes,
        visibleComplianceForms(allForms, "oo"),
        truckCount,
        entityCarrierId,
    );
    const trucksBad = !ooEntityTrucksVitalOk(entityDrivers);
    return !formsBad && !trucksBad;
}

/** Required forms must stay on the printable PDF. */
export function normalizeFormOptionPdfFlags<
    T extends {
        W2Required: boolean;
        OORequired: boolean;
        IncludeInPdf: boolean;
    },
>(data: T): T {
    if (data.W2Required || data.OORequired) {
        return {...data, IncludeInPdf: true};
    }
    return data;
}
