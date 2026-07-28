import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, within} from "@testing-library/react";
import React from "react";

vi.mock("../../src/elements/TableEntityLink", () => ({
    default: ({children}: {children: React.ReactNode}) => <span>{children}</span>,
}));

import MassEditLoadsTable from "../../src/components/collections/MassEditLoadsTable";

const sampleLoads = Array.from({length: 12}, (_, i) => ({
    ID: i + 1,
    TicketNumber: 999100 + i,
    StartDate: new Date("2099-01-06T12:00:00.000Z"),
    TotalRate: 17,
    TotalAmount: 340,
    Weight: 20,
    MaterialRate: 6,
    TruckRate: 11,
    DriverRate: 9,
    Notes: `Note ${i + 1}`,
    Customers: {Name: "Test Customer"},
    LoadTypes: {Description: "ASPHALT"},
    DeliveryLocations: {Description: "Site A"},
    Trucks: {Name: `Truck-${i % 3}`, Notes: ""},
    Drivers: {FirstName: "Test", LastName: "Driver"},
}));

describe("MassEditLoadsTable", () => {
    it("ME-C1: renders N load rows", () => {
        render(<MassEditLoadsTable jobId={42} loads={sampleLoads.slice(0, 3)} onRemove={vi.fn()} />);
        expect(screen.getByText("999100")).toBeInTheDocument();
        expect(screen.getByText("999102")).toBeInTheDocument();
        expect(screen.getAllByTestId(/mass-edit-load-row-/)).toHaveLength(3);
    });

    it("ME-C4: header shows job ID and count", () => {
        render(<MassEditLoadsTable jobId={123} loads={sampleLoads.slice(0, 2)} onRemove={vi.fn()} />);
        expect(screen.getByTestId("mass-edit-job-header")).toHaveTextContent("Job #123 — 2 loads selected");
    });

    it("ME-C2: expand chevron toggles detail", () => {
        render(<MassEditLoadsTable jobId={1} loads={[sampleLoads[0]!]} onRemove={vi.fn()} />);
        expect(screen.queryByTestId("mass-edit-detail-1")).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId("mass-edit-expand-1"));
        const detail = screen.getByTestId("mass-edit-detail-1");
        expect(within(detail).getByText(/Truck-0/)).toBeInTheDocument();
        expect(within(detail).getByText(/Note 1/)).toBeInTheDocument();
    });

    it("ME-C3: remove button calls onRemove with load ID", () => {
        const onRemove = vi.fn();
        render(<MassEditLoadsTable jobId={1} loads={[sampleLoads[0]!]} onRemove={onRemove} />);
        fireEvent.click(screen.getByTestId("mass-edit-remove-1"));
        expect(onRemove).toHaveBeenCalledWith(1);
    });

    it("ME-C5: scroll container when many rows", () => {
        render(<MassEditLoadsTable jobId={1} loads={sampleLoads} onRemove={vi.fn()} />);
        const scroll = screen.getByTestId("mass-edit-table-scroll");
        expect(scroll).toBeInTheDocument();
        expect(scroll.className).toMatch(/MuiTableContainer/);
    });

    it("ME-C6: no pagination controls", () => {
        render(<MassEditLoadsTable jobId={1} loads={sampleLoads} onRemove={vi.fn()} />);
        expect(screen.queryByRole("button", {name: /next page/i})).not.toBeInTheDocument();
        expect(screen.queryByRole("combobox", {name: /rows per page/i})).not.toBeInTheDocument();
    });
});
