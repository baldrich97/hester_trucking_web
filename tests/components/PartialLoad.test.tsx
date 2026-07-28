import {describe, expect, it, vi, beforeEach} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const {confirmAlert, mutateAsync} = vi.hoisted(() => ({
    confirmAlert: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../src/hooks/useSourcesCutover", () => ({
    useSourcesCutover: () => ({active: true, newLoadTypeIdThreshold: 10000}),
}));
vi.mock("next/router", () => ({
    useRouter: () => ({push: vi.fn(), replace: vi.fn()}),
}));
vi.mock("react-toastify", () => ({toast: vi.fn()}));
vi.mock("../../src/utils/appConfirm", () => ({
    confirmAlert,
    confirmDestructive: vi.fn(),
}));
vi.mock("jquery", () => ({default: vi.fn()}));
vi.mock("../../src/elements/GenericForm", () => ({
    default: ({
        fields,
        submitDisabled,
    }: {
        fields: Array<{name: string; size: number; label?: string}>;
        submitDisabled?: boolean;
    }) => (
        <div data-testid="generic-form">
            {fields.map((field) => (
                <span
                    key={field.name}
                    data-testid={`field-${field.name}`}
                    data-size={field.size}
                    data-label={field.label}
                />
            ))}
            <button type="submit" data-testid="form-submit" disabled={submitDisabled}>
                Submit
            </button>
        </div>
    ),
}));
vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useQuery: () => ({data: [], isLoading: false}),
        useMutation: () => ({mutateAsync, isLoading: false}),
    },
}));

import PartialLoad from "../../src/components/objects/PartialLoad";

const initialLoad = {
    ID: 42,
    TicketNumber: 999501,
    CustomerID: 1,
    DriverID: 2,
    TruckID: 3,
    LoadTypeID: 116,
    DeliveryLocationID: 4,
    Week: "2099-W01",
    StartDate: new Date("2099-01-06T12:00:00.000Z"),
    Created: new Date("2099-01-06T12:00:00.000Z"),
    Weight: 20,
    Hours: null,
    TruckRate: 11,
    MaterialRate: 6,
    DriverRate: 9,
    TotalRate: 17,
    TotalAmount: 340,
    Invoiced: null,
    InvoiceID: null,
    Deleted: false,
    JobID: 99,
};

describe("PartialLoad", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders mass-edit submit when initial load is provided", () => {
        render(
            <PartialLoad
                initialLoad={initialLoad}
                selectedLoads={[{ID: 42, TicketNumber: 999501}]}
                refreshData={vi.fn()}
            />,
        );
        expect(screen.getByTestId("form-submit")).toBeInTheDocument();
    });

    it("ME-C7: truck field not rendered; driver is full width", () => {
        render(
            <PartialLoad
                initialLoad={initialLoad}
                jobId={99}
                selectedLoads={[{ID: 42, TicketNumber: 999501}]}
                refreshData={vi.fn()}
            />,
        );
        expect(screen.queryByTestId("field-TruckID")).not.toBeInTheDocument();
        expect(screen.getByTestId("field-DriverID")).toHaveAttribute("data-size", "12");
    });

    it("ME-C8: confirm dialog lists tickets, job ID, and per-load preserve copy", async () => {
        const user = userEvent.setup();
        render(
            <PartialLoad
                initialLoad={initialLoad}
                jobId={99}
                selectedLoads={[
                    {ID: 42, TicketNumber: 999501},
                    {ID: 43, TicketNumber: 999502},
                ]}
                refreshData={vi.fn()}
            />,
        );

        await user.click(screen.getByTestId("form-submit"));

        await waitFor(() => expect(confirmAlert).toHaveBeenCalled());
        const args = confirmAlert.mock.calls[0]![0] as {message: React.ReactElement};
        const messageText = JSON.stringify(args.message);
        expect(messageText).toMatch(/999501/);
        expect(messageText).toMatch(/999502/);
        expect(messageText).toMatch(/"children":\["#",99\]/);
        expect(messageText).toMatch(/truck stay unchanged/i);
    });
});
