import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import React from "react";
import InvoiceLoads from "../../src/components/collections/InvoiceLoads";

describe("InvoiceLoads collection table", () => {
    it("renders empty toolbar when no rows", () => {
        const updateTotal = vi.fn();
        const updateSelected = vi.fn();
        render(
            <InvoiceLoads
                readOnly={false}
                rows={[]}
                updateTotal={updateTotal}
                updateSelected={updateSelected}
            />,
        );
        expect(screen.getByText(/Loads Available/i)).toBeInTheDocument();
        expect(updateTotal).toHaveBeenCalledWith(0);
        expect(updateSelected).toHaveBeenCalledWith([]);
    });

    it("renders ticket numbers for provided rows", () => {
        render(
            <InvoiceLoads
                readOnly={true}
                rows={[
                    {
                        ID: 1,
                        TicketNumber: 999001,
                        StartDate: new Date(),
                        TotalRate: 20,
                        TotalAmount: 360,
                        Drivers: {FirstName: "Test", LastName: "Driver"},
                        Trucks: {Name: "T-1"},
                        LoadTypes: {Description: "ASPHALT"},
                        DeliveryLocations: {Description: "Site"},
                    },
                ]}
                updateTotal={vi.fn()}
                updateSelected={vi.fn()}
            />,
        );
        expect(screen.getByText("999001")).toBeInTheDocument();
    });
});
