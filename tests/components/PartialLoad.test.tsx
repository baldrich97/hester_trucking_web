import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import React from "react";

vi.mock("../../src/hooks/useSourcesCutover", () => ({
    useSourcesCutover: () => ({active: true, newLoadTypeIdThreshold: 10000}),
}));
vi.mock("next/router", () => ({
    useRouter: () => ({push: vi.fn(), replace: vi.fn()}),
}));
vi.mock("react-toastify", () => ({toast: vi.fn()}));
vi.mock("../../src/utils/appConfirm", () => ({
    confirmAlert: vi.fn(),
    confirmDestructive: vi.fn(),
}));
vi.mock("jquery", () => ({default: vi.fn()}));
vi.mock("../../src/elements/GenericForm", () => ({
    default: ({submitDisabled}: {submitDisabled?: boolean}) => (
        <button type="submit" data-testid="form-submit" disabled={submitDisabled}>
            Submit
        </button>
    ),
}));
vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useQuery: () => ({data: [], isLoading: false}),
        useMutation: () => ({mutateAsync: vi.fn(), isLoading: false}),
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
});
