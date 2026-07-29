import {describe, expect, it} from "vitest";
import {
    isW2DriverDoneOnPdf,
    normalizeFormOptionPdfFlags,
    pdfColumnForms,
    type FormOptionPdfInput,
} from "../../src/utils/driverFormsPdf";
import type {DriverComplianceShape} from "../../src/utils/driverFormCompliance";

function makeForm(
    overrides: Partial<FormOptionPdfInput> & Pick<FormOptionPdfInput, "Form">,
): FormOptionPdfInput {
    return {
        ID: overrides.Form,
        W2Visible: true,
        OOVisible: false,
        W2Required: false,
        OORequired: false,
        FleetWide: false,
        ExpiryCadence: "EXPIRATION_DATE",
        ValidityMonths: null,
        PdfColumnLabel: null,
        IncludeInPdf: false,
        Forms: {Name: `form-${overrides.Form}`, DisplayName: `Form ${overrides.Form}`},
        ...overrides,
    };
}

describe("driverFormsPdf", () => {
    it("forces IncludeInPdf when a form is required", () => {
        expect(
            normalizeFormOptionPdfFlags({
                W2Required: true,
                OORequired: false,
                IncludeInPdf: false,
            }).IncludeInPdf,
        ).toBe(true);
    });

    it("includes required W2 forms in PDF columns even when IncludeInPdf is false", () => {
        const forms = [
            makeForm({Form: 1, W2Required: true, IncludeInPdf: false}),
            makeForm({Form: 2, W2Required: false, IncludeInPdf: true}),
        ];
        const columns = pdfColumnForms(forms, "w2");
        expect(columns.map((f) => f.Form)).toEqual([1, 2]);
    });

    it("Done is false when a required form is missing even if it is excluded from IncludeInPdf", () => {
        const forms = [makeForm({Form: 1, W2Required: true, IncludeInPdf: false})];
        const shape: DriverComplianceShape = {
            ID: 10,
            CarrierID: null,
            OwnerOperator: false,
            DriverForms: [],
        };
        expect(isW2DriverDoneOnPdf(shape, forms, [shape])).toBe(false);
    });

    it("Done is true when all required forms are satisfied", () => {
        const forms = [makeForm({Form: 1, W2Required: true, IncludeInPdf: false})];
        const shape: DriverComplianceShape = {
            ID: 10,
            CarrierID: null,
            OwnerOperator: false,
            DriverForms: [
                {
                    Form: 1,
                    Expiration: new Date("2099-12-31"),
                    Created: new Date("2099-01-01"),
                    CarrierID: null,
                    Filer: null,
                },
            ],
        };
        expect(isW2DriverDoneOnPdf(shape, forms, [shape])).toBe(true);
    });
});
