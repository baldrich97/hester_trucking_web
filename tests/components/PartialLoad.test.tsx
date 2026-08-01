import {describe, expect, it, vi, beforeEach} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const mutationHooks = vi.hoisted(() => ({
    confirmAlert: vi.fn(),
    mutateAsync: vi.fn(),
    onSuccess: undefined as undefined | ((result: unknown) => void),
    onError: undefined as undefined | ((error: {message: string}) => void),
}));

const {confirmAlert, mutateAsync} = mutationHooks;

vi.mock("../../src/hooks/useSourcesCutover", () => ({
    useSourcesCutover: () => ({active: true, newLoadTypeIdThreshold: 10000}),
}));
vi.mock("next/router", () => ({
    useRouter: () => ({push: vi.fn(), replace: vi.fn()}),
}));
vi.mock("react-toastify", () => ({toast: vi.fn()}));
vi.mock("../../src/utils/appConfirm", () => ({
    confirmAlert: (...args: unknown[]) => mutationHooks.confirmAlert(...args),
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
        useMutation: (_: string, opts?: {
            onSuccess?: (result: unknown) => void;
            onError?: (error: {message: string}) => void;
        }) => {
            mutationHooks.onSuccess = opts?.onSuccess;
            mutationHooks.onError = opts?.onError;
            return {mutateAsync, isLoading: false};
        },
    },
}));

import PartialLoad from "../../src/components/objects/PartialLoad";
import {toast} from "react-toastify";
import {CLOSED_JOB_REMATCH_WARNING} from "../../src/constants/loadWarnings";

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
        confirmAlert.mockImplementation(({buttons}) => {
            const confirm = buttons.find((b: {label: string}) => b.label === "Do Mass Edit");
            void confirm?.onClick?.();
        });
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

    it("LW-C1: shows warning toast (not success) when mass edit returns closed-job warning", async () => {
        const user = userEvent.setup();
        const refreshData = vi.fn();
        mutateAsync.mockImplementation(async () => {
            const result = {ok: true, warnings: [CLOSED_JOB_REMATCH_WARNING, "2099-W01", "5"]};
            mutationHooks.onSuccess?.(result);
            return result;
        });

        render(
            <PartialLoad
                initialLoad={initialLoad}
                jobId={99}
                selectedLoads={[{ID: 42, TicketNumber: 999501}]}
                refreshData={refreshData}
            />,
        );

        await user.click(screen.getByTestId("form-submit"));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
        expect(toast).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({type: "warning"}),
        );
        expect(toast).not.toHaveBeenCalledWith("Successfully Submitted!", expect.objectContaining({type: "success"}));
        expect(refreshData).toHaveBeenCalled();
    });

    it("LW-C2: shows success toast when mass edit returns no warnings", async () => {
        const user = userEvent.setup();
        mutateAsync.mockImplementation(async () => {
            const result = {ok: true, warnings: [] as string[]};
            mutationHooks.onSuccess?.(result);
            return result;
        });

        render(
            <PartialLoad
                initialLoad={initialLoad}
                jobId={99}
                selectedLoads={[{ID: 42, TicketNumber: 999501}]}
                refreshData={vi.fn()}
            />,
        );

        await user.click(screen.getByTestId("form-submit"));
        await waitFor(() =>
            expect(toast).toHaveBeenCalledWith("Successfully Submitted!", expect.objectContaining({type: "success"})),
        );
    });

    it("LW-C3: shows error toast when mass edit mutation fails", async () => {
        const user = userEvent.setup();
        mutateAsync.mockResolvedValue({ok: true, warnings: []});

        render(
            <PartialLoad
                initialLoad={initialLoad}
                jobId={99}
                selectedLoads={[{ID: 42, TicketNumber: 999501}]}
                refreshData={vi.fn()}
            />,
        );

        await user.click(screen.getByTestId("form-submit"));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
        mutationHooks.onError?.(new Error("This job has already been paid out."));
        expect(toast).toHaveBeenCalledWith(
            expect.stringMatching(/paid out/i),
            expect.objectContaining({type: "error"}),
        );
    });

    it("LW-C4: shows validation toast when required field missing", async () => {
        const user = userEvent.setup();
        const incompleteLoad = {...initialLoad, DriverID: null};

        render(
            <PartialLoad
                initialLoad={incompleteLoad}
                jobId={99}
                selectedLoads={[{ID: 42, TicketNumber: 999501}]}
                refreshData={vi.fn()}
            />,
        );

        await user.click(screen.getByTestId("form-submit"));
        await waitFor(() =>
            expect(toast).toHaveBeenCalledWith(
                expect.stringMatching(/Missing Driver ID/i),
                expect.objectContaining({type: "error"}),
            ),
        );
        expect(mutateAsync).not.toHaveBeenCalled();
    });
});
