// @vitest-environment node
import {describe, expect, it} from "vitest";
import React from "react";
import {renderToBuffer} from "@react-pdf/renderer";

import PayStubPrintable from "../../src/components/objects/PayStubPrintable";
import InvoicePrintableBasic from "../../src/components/objects/InvoicePrintableBasic";
import SourceReportPrintable from "../../src/components/objects/SourceReportPrintable";

function expectPdf(buffer: Buffer): void {
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
}

const customer = {
    ID: 4,
    Name: "[TEST] Customer",
    Street: "1 Test Rd",
    City: "Testville",
    ZIP: "12345",
    States: {ID: 1, Name: "Tennessee", Abbreviation: "TN"},
};

const baseLoad = {
    ID: 10,
    StartDate: new Date("2099-01-04T12:00:00.000Z"),
    TicketNumber: 999601,
    Weight: 20,
    Hours: null,
    TotalRate: 15,
    TotalAmount: 300,
    LoadTypes: {ID: 2, Description: "Gravel"},
    DeliveryLocations: {ID: 5, Description: "[TEST] Site"},
    Trucks: {ID: 3, Notes: "Truck #12"},
};

describe("PayStubPrintable", () => {
    it("renders a PDF for a paystub with jobs", async () => {
        const payStub = {
            ID: 50,
            Created: new Date("2099-01-04T12:00:00.000Z"),
            DepositDate: new Date("2099-01-08T12:00:00.000Z"),
            CheckNumber: "1001",
            Gross: 300,
            Percentage: 25,
            NetTotal: 75,
            Additions: 10,
            Deductions: 5,
            TakeHome: 80,
            Notes: "[TEST] paystub note",
            Drivers: {ID: 1, FirstName: "Test", LastName: "Driver", Active: true},
            Jobs: [
                {
                    ID: 20,
                    TruckingRate: 10,
                    DriverRate: 8,
                    TruckingRevenue: null,
                    LoadTypes: {Description: "Gravel"},
                    Customers: {Name: "[TEST] Customer"},
                    DeliveryLocations: {Description: "[TEST] Site"},
                    Loads: [{StartDate: "2099-01-04", Weight: 20}],
                },
            ],
        };
        const buffer = await renderToBuffer(
            <PayStubPrintable payStub={payStub as never} />,
        );
        expectPdf(buffer);
    });

    it("renders with a missing check number and empty jobs", async () => {
        const payStub = {
            ID: 51,
            Created: new Date("2099-01-04T12:00:00.000Z"),
            DepositDate: null,
            CheckNumber: null,
            Gross: 0,
            Percentage: 0,
            NetTotal: 0,
            Additions: 0,
            Deductions: 0,
            TakeHome: 0,
            Notes: null,
            Drivers: {ID: 1, FirstName: "Test", LastName: "Driver", Active: true},
            Jobs: [],
        };
        const buffer = await renderToBuffer(
            <PayStubPrintable payStub={payStub as never} />,
        );
        expectPdf(buffer);
    });
});

describe("InvoicePrintableBasic", () => {
    it("renders a per-load invoice", async () => {
        const invoice = {
            ID: 60,
            Number: 7001,
            InvoiceDate: new Date("2099-01-08T12:00:00.000Z"),
            TotalAmount: 300,
            Customers: customer,
            Loads: [baseLoad],
            Weeklies: [],
        };
        const buffer = await renderToBuffer(
            <InvoicePrintableBasic invoice={invoice as never} invoices={null} />,
        );
        expectPdf(buffer);
    });

    it("renders a weekly-based invoice", async () => {
        const invoice = {
            ID: 61,
            Number: 7002,
            InvoiceDate: new Date("2099-01-08T12:00:00.000Z"),
            TotalAmount: 500,
            Customers: customer,
            Loads: [],
            Weeklies: [
                {
                    ID: 40,
                    Week: "2099-01-04",
                    Revenue: 500,
                    TotalWeight: 40,
                    CompanyRate: 12.5,
                    LoadTypes: {Description: "Gravel"},
                    DeliveryLocations: {Description: "[TEST] Site"},
                },
            ],
        };
        const buffer = await renderToBuffer(
            <InvoicePrintableBasic invoice={invoice as never} invoices={null} />,
        );
        expectPdf(buffer);
    });

    it("renders a consolidated invoice with child invoices", async () => {
        const child = {
            ID: 62,
            Number: 7003,
            InvoiceDate: new Date("2099-01-08T12:00:00.000Z"),
            TotalAmount: 300,
            Customers: customer,
            Loads: [baseLoad],
            Weeklies: [],
        };
        const parent = {...child, ID: 63, Number: 7004};
        const buffer = await renderToBuffer(
            <InvoicePrintableBasic
                invoice={parent as never}
                invoices={[child] as never}
            />,
        );
        expectPdf(buffer);
    });
});

describe("SourceReportPrintable", () => {
    // Uses the remote Nunito font; requires network access on first render.
    it("renders an audit report with summary", async () => {
        const rows = [
            {
                ID: 10,
                StartDate: new Date("2099-01-04T12:00:00.000Z"),
                TicketNumber: 999601,
                Weight: 20,
                TotalAmount: 300,
                TotalRate: 15,
                LoadType: "Gravel",
                Customer: "[TEST] Customer",
                DeliveryLocation: "[TEST] Site",
            },
        ];
        const buffer = await renderToBuffer(
            <SourceReportPrintable
                sourceName="[TEST] Source"
                startDate="2099-01-01"
                endDate="2099-01-31"
                rows={rows}
                summary={{
                    totalLoads: 1,
                    totalTonnage: 20,
                    totalAmount: 300,
                    byLoadType: [
                        {loadType: "Gravel", totalLoads: 1, totalTonnage: 20, totalAmount: 300},
                    ],
                }}
            />,
        );
        expectPdf(buffer);
    }, 30000);
});
