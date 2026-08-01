// @vitest-environment node
import {describe, expect, it} from "vitest";
import React from "react";
import {renderToBuffer} from "@react-pdf/renderer";
import DriverFormsPrintable from "../../src/components/objects/DriverFormsPrintable";
import {isW2DriverDoneOnPdf} from "../../src/utils/driverFormsPdf";

describe("DriverFormsPrintable", () => {
    it("renders W2 PDF without Done check when required form is missing", async () => {
        const forms = [
            {
                ID: 1,
                Form: 1,
                W2Visible: true,
                OOVisible: false,
                W2Required: true,
                OORequired: false,
                FleetWide: false,
                ExpiryCadence: "EXPIRATION_DATE" as const,
                ValidityMonths: null,
                PdfColumnLabel: "REQ",
                IncludeInPdf: false,
                Forms: {Name: "req", DisplayName: "Required Form"},
            },
        ];
        const drivers = [
            {
                ID: 5,
                FirstName: "Test",
                LastName: "Driver",
                OwnerOperator: false,
                CarrierID: null,
                TIN: null,
                Phone: null,
                Street: null,
                City: null,
                ZIP: null,
                PayMethod: null,
                DriverForms: [],
                States: null,
                Carriers: null,
            },
        ];

        const shape = {
            ID: 5,
            CarrierID: null,
            OwnerOperator: false,
            DriverForms: [],
        };
        expect(isW2DriverDoneOnPdf(shape, forms, [shape])).toBe(false);

        const buffer = await renderToBuffer(
            <DriverFormsPrintable
                title="W-2 driver forms"
                mode="w2"
                drivers={drivers as never}
                allForms={forms}
            />,
        );
        expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
        expect(buffer.length).toBeGreaterThan(500);
    });
});
