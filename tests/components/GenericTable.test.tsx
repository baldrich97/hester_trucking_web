import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, within} from "@testing-library/react";
import React from "react";
import GenericTable from "../../src/elements/GenericTable";

vi.mock("next/link", () => ({
    default: ({children, href}: {children: React.ReactNode; href: string}) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock("../../src/elements/TableEntityLink", () => ({
    default: ({children}: {children: React.ReactNode}) => <span>{children}</span>,
}));

const columns = [
    {name: "Customers.Name", as: "Customer", column: "CustomerID"},
    {name: "TicketNumber", as: "Ticket #"},
    {name: "ID", as: "", navigateTo: "/loads/"},
] as const;

const overrides = [
    {name: "ID", type: "button" as const},
    {name: "Customers.Name", type: "link" as const},
];

const rows = [
    {ID: 1, TicketNumber: 1001, Customers: {Name: "Alpha", ID: 10}},
    {ID: 2, TicketNumber: 1002, Customers: {Name: "Beta", ID: 11}},
];

describe("GenericTable", () => {
    it("opens filter modal and runs search", () => {
        const doSearch = vi.fn();
        const clearFilter = vi.fn();
        render(
            <GenericTable
                data={rows}
                columns={[...columns]}
                overrides={[...overrides]}
                count={2}
                refreshData={vi.fn()}
                filterBody={<div>Filter body</div>}
                doSearch={doSearch}
                clearFilter={clearFilter}
            />,
        );

        fireEvent.click(screen.getByRole("button", {name: /open filter modal/i}));
        expect(screen.getByText("Filter body")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: /^apply$/i}));
        expect(doSearch).toHaveBeenCalled();
    });

    it("sorts by column and refreshes data", () => {
        const refreshData = vi.fn();
        render(
            <GenericTable
                data={rows}
                columns={[...columns]}
                overrides={[...overrides]}
                count={20}
                refreshData={refreshData}
            />,
        );

        fireEvent.click(screen.getByRole("button", {name: /ticket #/i}));
        expect(refreshData).toHaveBeenCalledWith(0, "TicketNumber", "asc");
    });

    it("paginates to the next page", () => {
        const refreshData = vi.fn();
        render(
            <GenericTable
                data={rows}
                columns={[...columns]}
                overrides={[...overrides]}
                count={20}
                refreshData={refreshData}
            />,
        );

        const footer = screen.getByRole("table").parentElement;
        const next = within(footer!).getByLabelText("next page");
        fireEvent.click(next);
        expect(refreshData).toHaveBeenCalledWith(1, "ID", "desc");
    });

    it("paginates back to the previous page", () => {
        const refreshData = vi.fn();
        render(
            <GenericTable
                data={rows}
                columns={[...columns]}
                overrides={[...overrides]}
                count={20}
                refreshData={refreshData}
            />,
        );

        const footer = screen.getByRole("table").parentElement;
        const next = within(footer!).getByLabelText("next page");
        fireEvent.click(next);
        refreshData.mockClear();

        const prev = within(footer!).getByLabelText("previous page");
        fireEvent.click(prev);
        expect(refreshData).toHaveBeenCalledWith(0, "ID", "desc");
    });
});
