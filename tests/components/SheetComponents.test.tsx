import {describe, expect, it, vi} from "vitest";
import {render, screen, fireEvent} from "@testing-library/react";
import React from "react";

// Stable references: fresh objects per render cause infinite effect loops
// in components with data-dependent effects (e.g. RHAutocomplete).
const {stableQuery, stableMutation} = vi.hoisted(() => ({
    stableQuery: {data: undefined, isLoading: false, refetch: () => undefined},
    stableMutation: {mutateAsync: async () => undefined, isLoading: false},
}));
vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useQuery: () => stableQuery,
        useMutation: () => stableMutation,
    },
}));
vi.mock("react-toastify", () => ({toast: vi.fn()}));
vi.mock("next/router", () => ({
    useRouter: () => ({push: vi.fn(), replace: vi.fn(), reload: vi.fn(), query: {}}),
}));
const confirmDestructive = vi.fn();
vi.mock("../../src/utils/appConfirm", () => ({
    confirmAlert: vi.fn(),
    confirmDestructive: (...args: unknown[]) => confirmDestructive(...args),
    confirmProceed: vi.fn(),
}));
vi.mock("../../src/elements/Autocomplete", () => ({
    default: () => <div data-testid="basic-autocomplete" />,
}));

import DailySheet from "../../src/components/objects/DailySheet";
import WeeklySheet from "../../src/components/objects/WeeklySheet";
import PayStub from "../../src/components/objects/PayStub";

const driver = {
    ID: 1,
    FirstName: "Test",
    LastName: "Driver",
    OwnerOperator: false,
    Active: true,
};

const load = {
    ID: 10,
    JobID: 20,
    StartDate: new Date("2099-01-04T12:00:00.000Z"),
    TicketNumber: 999601,
    MaterialRate: 5,
    TruckRate: 10,
    DriverRate: 8,
    TotalRate: 15,
    Weight: 20,
    Hours: null,
    Trucks: {ID: 3, Name: "[TEST] Truck", Notes: "Truck #12", Active: true},
};

const job = {
    ID: 20,
    PaidOut: false,
    TruckingRevenue: null,
    CompanyRevenue: null,
    LoadTypes: {ID: 2, Description: "Gravel"},
    Customers: {ID: 4, Name: "[TEST] Customer"},
    DeliveryLocations: {ID: 5, Description: "[TEST] Site"},
    Drivers: driver,
    Weeklies: null,
    Loads: [load],
};

describe("DailySheet", () => {
    const sheet = {
        ID: 30,
        Week: "2099-01-04",
        LastPrinted: null,
        DriverID: driver.ID,
        Drivers: driver,
        Jobs: [job],
    };

    it("renders driver name, header, load row, and print button", () => {
        render(
            <DailySheet
                sheet={sheet as never}
                week="2099-01-04"
                forceExpand={true}
                initialExpand={null}
            />,
        );
        expect(screen.getByText("Test Driver")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /print week/i})).toBeInTheDocument();
        expect(screen.getByText("999601")).toBeInTheDocument();
        expect(screen.getByText("Gravel")).toBeInTheDocument();
        expect(screen.getByText("[TEST] Customer")).toBeInTheDocument();
        expect(screen.getByText("Material Rate")).toBeInTheDocument();
    });

    it("asks for confirmation before closing a job", () => {
        render(
            <DailySheet
                sheet={sheet as never}
                week="2099-01-04"
                forceExpand={true}
                initialExpand={null}
            />,
        );
        // Totals-row action button is the small icon button (not Print Week / expander).
        const buttons = screen.getAllByRole("button");
        const actionBtn = buttons[buttons.length - 1]!;
        fireEvent.click(actionBtn);
        expect(confirmDestructive).toHaveBeenCalledWith(
            expect.objectContaining({title: "Confirm Job Closure"}),
        );
    });
});

describe("WeeklySheet", () => {
    const weekly = {
        ID: 40,
        Week: "2099-01-04",
        CustomerID: 4,
        LoadTypeID: 2,
        DeliveryLocationID: 5,
        CompanyRate: 7,
        LastPrinted: null,
        InvoiceID: null,
        Customers: {ID: 4, Name: "[TEST] Customer"},
        LoadTypes: {ID: 2, Description: "Gravel"},
        DeliveryLocations: {ID: 5, Description: "[TEST] Site"},
        Jobs: [job],
    };

    it("renders customer header, driver row, and action buttons", () => {
        render(
            <WeeklySheet
                weekly={weekly as never}
                week="2099-01-04"
                forceExpand={true}
                initialExpand={null}
                forceRefresh={null}
            />,
        );
        expect(
            screen.getByText(/\[TEST\] Customer \| Gravel \| \[TEST\] Site/),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /print week/i})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /edit weekly/i})).toBeInTheDocument();
        expect(screen.getByText("Test Driver")).toBeInTheDocument();
        // Truck number parsed from Trucks.Notes ("Truck #12" -> "12").
        expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("skips jobs without loads", () => {
        const emptyWeekly = {...weekly, Jobs: [{...job, ID: 21, Loads: []}]};
        render(
            <WeeklySheet
                weekly={emptyWeekly as never}
                week="2099-01-04"
                forceExpand={true}
                initialExpand={null}
                forceRefresh={null}
            />,
        );
        expect(screen.queryByText("Test Driver")).not.toBeInTheDocument();
    });
});

describe("PayStub", () => {
    it("renders create form fields", () => {
        render(<PayStub />);
        expect(screen.getByLabelText(/Gross/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Percentage/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Take Home Total/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Check Number/i)).toBeInTheDocument();
    });
});
