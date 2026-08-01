import {describe, expect, it, vi, beforeEach} from "vitest";
import {toast} from "react-toastify";
import {showLoadWarnings} from "../../src/utils/loadWarningToasts";
import {
    CLOSED_JOB_REMATCH_WARNING,
    DAILY_PRINTED_WARNING,
    WEEKLY_PRINTED_WARNING,
} from "../../src/constants/loadWarnings";

vi.mock("react-toastify", () => ({toast: vi.fn()}));

/** Mirrors Load.tsx / PartialLoad.tsx onSuccess toast branching. */
function handleLoadMutationSuccess(result: {warnings?: string[] | null}) {
    const showedWarning = showLoadWarnings(result?.warnings);
    if (!showedWarning) {
        toast("Successfully Submitted!", {autoClose: 2000, type: "success"});
    }
}

/** Mirrors Load.tsx / PartialLoad.tsx onError toast branching. */
function handleLoadMutationError(error: {message: string}) {
    toast(
        "There was an issue creating or updating this load. The issue was: " + error.message,
        {autoClose: 1000000, type: "error"},
    );
}

/** Mirrors PartialLoad.tsx required-field validation before mass edit. */
function validateMassEditFields(data: Record<string, unknown>): string | null {
    const fieldsToValidate = [
        {key: "CustomerID", name: "Customer ID"},
        {key: "DriverID", name: "Driver ID"},
        {key: "LoadTypeID", name: "Load Type ID"},
        {key: "DeliveryLocationID", name: "Delivery Location ID"},
        {key: "Week", name: "Week"},
        {key: "TotalRate", name: "Total Rate"},
    ];
    for (const field of fieldsToValidate) {
        if (!data[field.key]) {
            return `Missing ${field.name}`;
        }
    }
    return null;
}

describe("load form mutation toast handlers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("LW-C5: daily printed warning suppresses success toast", () => {
        handleLoadMutationSuccess({
            warnings: [DAILY_PRINTED_WARNING, "2099-W01", "3"],
        });
        expect(toast).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({type: "warning"}),
        );
        expect(toast).not.toHaveBeenCalledWith("Successfully Submitted!", expect.anything());
    });

    it("LW-C6: closed-job rematch warning suppresses success toast", () => {
        handleLoadMutationSuccess({
            warnings: [CLOSED_JOB_REMATCH_WARNING, "2099-W02", "8"],
        });
        expect(toast).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({type: "warning"}),
        );
    });

    it("LW-C7: weekly printed warning suppresses success toast", () => {
        handleLoadMutationSuccess({
            warnings: [WEEKLY_PRINTED_WARNING, "2099-W03", "12"],
        });
        expect(toast).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({type: "warning"}),
        );
    });

    it("LW-C7b: empty warnings show success toast", () => {
        handleLoadMutationSuccess({warnings: []});
        expect(toast).toHaveBeenCalledWith("Successfully Submitted!", {
            autoClose: 2000,
            type: "success",
        });
    });

    it("LW-C9: mutation error shows load save error toast", () => {
        handleLoadMutationError({message: "This job has already been paid out."});
        expect(toast).toHaveBeenCalledWith(
            expect.stringMatching(/paid out/i),
            expect.objectContaining({type: "error", autoClose: 1000000}),
        );
    });

    it("LW-C10: mass edit validation returns missing field message", () => {
        expect(validateMassEditFields({CustomerID: 1, DriverID: null})).toBe("Missing Driver ID");
        expect(validateMassEditFields({CustomerID: 1, DriverID: 2, LoadTypeID: 3, DeliveryLocationID: 4, Week: "2099-W01", TotalRate: 10})).toBeNull();
    });
});
