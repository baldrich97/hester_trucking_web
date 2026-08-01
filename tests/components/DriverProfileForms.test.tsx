import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, within} from "@testing-library/react";
import React from "react";

const {mutations, routerReplace, confirmDestructive, toastMock} = vi.hoisted(() => {
    const makeMutation = () => ({
        mutate: vi.fn((_input?: unknown) => undefined),
        mutateAsync: vi.fn(async (_input?: unknown) => undefined),
        isLoading: false,
    });
    return {
        mutations: {put: makeMutation(), del: makeMutation(), driverPost: makeMutation()},
        routerReplace: vi.fn(),
        confirmDestructive: vi.fn(),
        toastMock: Object.assign(vi.fn(), {
            success: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
        }),
    };
});

vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useMutation: (key: string) => {
            if (key === "driverForms.put") return mutations.put;
            if (key === "driverForms.delete") return mutations.del;
            if (key === "drivers.post") return mutations.driverPost;
            return mutations.put;
        },
        useQuery: () => ({data: undefined, isLoading: false}),
    },
}));
vi.mock("react-toastify", () => ({toast: toastMock}));
vi.mock("next/router", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: routerReplace,
        asPath: "/drivers/2?tab=forms",
        query: {tab: "forms"},
    }),
}));
vi.mock("../../src/utils/appConfirm", () => ({
    confirmAlert: vi.fn(),
    confirmDestructive: (...args: unknown[]) => confirmDestructive(...(args as [unknown])),
    confirmProceed: vi.fn(),
}));
vi.mock("../../src/elements/TableEntityLink", () => ({
    default: ({href, children}: {href: string; children: React.ReactNode}) => (
        <a href={href}>{children}</a>
    ),
}));

import DriverProfileForms, {
    computeDriverFormsIssueCount,
} from "../../src/components/collections/DriverProfileForms";
import type {DriverFormsDataType} from "../../src/components/collections/DriverForms";
import type {CompleteFormOptions} from "../../prisma/zod";

const FUTURE = "2099-12-31T12:00:00.000Z";
const FILED = "2026-01-05T12:00:00.000Z";

function formOption(overrides: Record<string, unknown>): CompleteFormOptions {
    return {
        ID: 1,
        Form: 101,
        W2Visible: false,
        OOVisible: false,
        W2Required: false,
        OORequired: false,
        FleetWide: false,
        ExpiryCadence: "EXPIRATION_DATE",
        ValidityMonths: null,
        PdfOrder: null,
        PdfColumnLabel: null,
        IncludeInPdf: false,
        Forms: {ID: 101, Name: "FORM", DisplayName: "Form"},
        ...overrides,
    } as unknown as CompleteFormOptions;
}

function driver(overrides: Record<string, unknown>): DriverFormsDataType {
    return {
        ID: 1,
        FirstName: "Test",
        LastName: "Driver",
        OwnerOperator: false,
        CarrierID: null,
        Street: "1 Main St",
        City: "Tulsa",
        ZIP: "74000",
        Phone: "555-0000",
        States: {ID: 1, Name: "Oklahoma", Abbreviation: "OK"},
        DriverForms: [],
        TrucksDriven: [],
        LicenseExpiration: null,
        ...overrides,
    } as unknown as DriverFormsDataType;
}

const medCard = formOption({
    ID: 1,
    Form: 101,
    W2Visible: true,
    W2Required: true,
    ExpiryCadence: "EXPIRATION_DATE",
    Forms: {ID: 101, Name: "MED", DisplayName: "Medical Card"},
});
const w9 = formOption({
    ID: 2,
    Form: 102,
    W2Visible: true,
    W2Required: false,
    ExpiryCadence: "NONE",
    Forms: {ID: 102, Name: "W9", DisplayName: "W-9"},
});

const alice = driver({
    ID: 1,
    FirstName: "Alice",
    LastName: "Anderson",
    DriverForms: [
        {ID: 11, Driver: 1, Form: 101, Expiration: FUTURE, Created: FILED, CarrierID: null, Filer: null},
    ],
});
const bob = driver({ID: 2, FirstName: "Bob", LastName: "Brown"});

beforeEach(() => {
    vi.clearAllMocks();
});

describe("computeDriverFormsIssueCount", () => {
    it("counts missing required forms and license issues", () => {
        const count = computeDriverFormsIssueCount(bob, [bob], [medCard, w9], "w2");
        expect(count).toBeGreaterThanOrEqual(1);
    });

    it("returns zero when all required forms and license are good", () => {
        const good = driver({
            ...alice,
            LicenseExpiration: FUTURE,
        });
        const count = computeDriverFormsIssueCount(good, [good], [medCard, w9], "w2");
        expect(count).toBe(0);
    });
});

describe("DriverProfileForms", () => {
    it("renders required and optional form cards with status", () => {
        render(
            <DriverProfileForms
                driver={bob}
                entityDrivers={[bob]}
                allForms={[medCard, w9]}
                mode="w2"
            />,
        );

        expect(screen.getByText("Required forms")).toBeTruthy();
        expect(screen.getByText("Medical Card")).toBeTruthy();
        expect(screen.getAllByText("Missing").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("CDL / License")).toBeTruthy();
        expect(screen.getByRole("link", {name: "View all drivers on fleet compliance page"})).toHaveAttribute(
            "href",
            "/drivers/w2_forms",
        );
    });

    it("opens filing modal from Mark on file button", async () => {
        render(
            <DriverProfileForms
                driver={bob}
                entityDrivers={[bob]}
                allForms={[medCard, w9]}
                mode="w2"
            />,
        );

        const medCardRow = screen.getByText("Medical Card").closest(".MuiPaper-root")!;
        fireEvent.click(within(medCardRow).getByRole("button", {name: "Mark on file"}));
        expect(screen.getByText("Set expiration date")).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/Expiration date/i), {
            target: {value: "12/31/2099"},
        });
        fireEvent.click(screen.getByRole("button", {name: "Save"}));

        await vi.waitFor(() => {
            expect(mutations.put.mutateAsync).toHaveBeenCalledTimes(1);
        });
        expect(routerReplace).toHaveBeenCalled();
    });

    it("confirms before removing an on-file form", () => {
        render(
            <DriverProfileForms
                driver={alice}
                entityDrivers={[alice]}
                allForms={[medCard, w9]}
                mode="w2"
            />,
        );

        fireEvent.click(screen.getByRole("button", {name: "Remove"}));
        expect(confirmDestructive).toHaveBeenCalledTimes(1);
        const args = confirmDestructive.mock.calls[0]![0] as {onConfirm: () => void};
        args.onConfirm();
        expect(mutations.del.mutate).toHaveBeenCalledWith({driverId: 1, formId: 101});
    });
});
