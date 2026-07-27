import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, within} from "@testing-library/react";
import React from "react";

// Stable references (fresh objects per render cause infinite effect loops).
const {mutations, queryHolder, toastMock} = vi.hoisted(() => {
    const makeMutation = () => ({
        mutate: vi.fn((_input?: unknown) => undefined),
        mutateAsync: vi.fn(async (_input?: unknown) => undefined),
        isLoading: false,
    });
    return {
        mutations: {put: makeMutation(), del: makeMutation()},
        queryHolder: {
            value: {
                data: undefined as unknown,
                isLoading: false,
                isFetching: false,
                refetch: vi.fn(),
            },
        },
        toastMock: Object.assign(vi.fn(), {
            success: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
        }),
    };
});
vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useMutation: (key: string) =>
            key === "driverForms.put" ? mutations.put : mutations.del,
        useQuery: () => queryHolder.value,
    },
}));
vi.mock("react-toastify", () => ({toast: toastMock}));
const routerReplace = vi.fn();
vi.mock("next/router", () => ({
    useRouter: () => ({push: vi.fn(), replace: routerReplace, asPath: "/drivers/w2_forms", query: {}}),
}));
const confirmDestructive = vi.fn();
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

import DriverForms, {type DriverFormsDataType} from "../../src/components/collections/DriverForms";
import DriverFormsExpiringSoon from "../../src/components/collections/DriverFormsExpiringSoon";
import type {CompleteFormOptions} from "../../prisma/zod";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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
        ...overrides,
    } as unknown as DriverFormsDataType;
}

function truck(overrides: Record<string, unknown>) {
    return {
        ID: 1,
        Name: "Truck",
        VIN: "VIN123456",
        LicensePlate: "PLT-1",
        Make: "Kenworth",
        Model: "T680",
        ModelYear: 2020,
        LicensedState: 1,
        LicensedIn: {ID: 1, Name: "Oklahoma", Abbreviation: "OK"},
        Deleted: false,
        ...overrides,
    };
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

// ---------------------------------------------------------------------------
// DriverForms — W2 mode
// ---------------------------------------------------------------------------

describe("DriverForms (w2 mode)", () => {
    it("renders drivers with per-form checkbox states and missing-required marker", () => {
        render(<DriverForms data={[alice, bob]} all_forms={[medCard, w9]} mode="w2" />);

        expect(screen.getByRole("link", {name: "Alice Anderson"})).toBeTruthy();
        expect(screen.getByRole("link", {name: "Bob Brown"})).toBeTruthy();
        expect(screen.getByText("Medical Card")).toBeTruthy();
        expect(screen.getByText("W-9")).toBeTruthy();

        // Bob misses the required Medical Card -> asterisk marker.
        expect(screen.getByText("*")).toBeTruthy();

        // Row-major: [alice-med, alice-w9, bob-med, bob-w9]
        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes).toHaveLength(4);
        expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
        expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
        expect((checkboxes[2] as HTMLInputElement).checked).toBe(false);
        expect((checkboxes[3] as HTMLInputElement).checked).toBe(false);
    });

    it("files a form through the date modal", async () => {
        render(<DriverForms data={[alice, bob]} all_forms={[medCard, w9]} mode="w2" />);

        // Bob + Medical Card (unsatisfied) -> opens the modal.
        fireEvent.click(screen.getAllByRole("checkbox")[2]!);
        expect(screen.getByText("Set expiration date")).toBeTruthy();
        expect(screen.getByText("Explicit expiration date")).toBeTruthy();

        const saveButton = screen.getByRole("button", {name: "Save"});
        expect((saveButton as HTMLButtonElement).disabled).toBe(true);

        fireEvent.change(screen.getByLabelText(/Expiration date/i), {
            target: {value: "12/31/2099"},
        });
        expect((saveButton as HTMLButtonElement).disabled).toBe(false);
        // Live preview reflects the picked date.
        expect(screen.getByText(/Expires on 12\/31\/2099/)).toBeTruthy();

        fireEvent.click(saveButton);
        await vi.waitFor(() => {
            expect(mutations.put.mutateAsync).toHaveBeenCalledTimes(1);
        });
        const payload = mutations.put.mutateAsync.mock.calls[0]![0] as Record<string, unknown>;
        expect(payload.Driver).toBe(2);
        expect(payload.Form).toBe(101);
        expect(payload.Expiration).toBeInstanceOf(Date);
        expect(routerReplace).toHaveBeenCalled();
    });

    it("asks for confirmation before removing a satisfied filing", () => {
        render(<DriverForms data={[alice, bob]} all_forms={[medCard, w9]} mode="w2" />);

        // Alice + Medical Card is satisfied -> destructive confirm, then delete.
        fireEvent.click(screen.getAllByRole("checkbox")[0]!);
        expect(confirmDestructive).toHaveBeenCalledTimes(1);
        const args = confirmDestructive.mock.calls[0]![0] as {
            title: string;
            onConfirm: () => void;
        };
        expect(args.title).toBe("Remove filing");

        args.onConfirm();
        expect(mutations.del.mutate).toHaveBeenCalledWith({driverId: 1, formId: 101});
    });
});

// ---------------------------------------------------------------------------
// DriverForms — OO mode
// ---------------------------------------------------------------------------

const insurance = formOption({
    ID: 3,
    Form: 201,
    OOVisible: true,
    OORequired: true,
    ExpiryCadence: "EXPIRATION_DATE",
    Forms: {ID: 201, Name: "INS", DisplayName: "Insurance"},
});
const fleetForm = formOption({
    ID: 4,
    Form: 202,
    OOVisible: true,
    OORequired: false,
    FleetWide: true,
    ExpiryCadence: "NONE",
    Forms: {ID: 202, Name: "FLEET", DisplayName: "Fleet Contract"},
});

const acme = {
    ID: 9,
    Name: "Acme Trucking",
    ContactName: "Carl Acme",
    Street: "9 Depot Rd",
    City: "Tulsa",
    ZIP: "74001",
    Phone: "555-9999",
    States: {ID: 1, Name: "Oklahoma", Abbreviation: "OK"},
};

const carla = driver({
    ID: 3,
    FirstName: "Carla",
    LastName: "Three",
    OwnerOperator: true,
    CarrierID: 9,
    Carriers: acme,
    DriverForms: [
        {ID: 31, Driver: 3, Form: 201, Expiration: FUTURE, Created: FILED, CarrierID: 9, Filer: "Carl"},
    ],
    TrucksDriven: [{TruckID: 51, Trucks: truck({ID: 51, Name: "Truck One"})}],
});
const dave = driver({
    ID: 4,
    FirstName: "Dave",
    LastName: "Four",
    OwnerOperator: true,
    CarrierID: 9,
    Carriers: acme,
    TrucksDriven: [{TruckID: 52, Trucks: truck({ID: 52, Name: "Truck Two", VIN: ""})}],
});
const eve = driver({
    ID: 5,
    FirstName: "Eve",
    LastName: "Solo",
    OwnerOperator: true,
    DriverForms: [
        {ID: 51, Driver: 5, Form: 201, Expiration: FUTURE, Created: FILED, CarrierID: null, Filer: null},
    ],
    TrucksDriven: [{TruckID: 53, Trucks: truck({ID: 53, Name: "Truck Three"})}],
});

describe("DriverForms (oo mode)", () => {
    it("groups carrier drivers into one entity and solo operators into their own", () => {
        render(
            <DriverForms data={[carla, dave, eve]} all_forms={[insurance, fleetForm]} mode="oo" />,
        );

        expect(screen.getByText("Acme Trucking")).toBeTruthy();
        expect(screen.getByText(/Carla Three, Dave Four/)).toBeTruthy();
        expect(screen.getByText("Filing apply to the carrier as a whole.")).toBeTruthy();
        expect(screen.getByText("Eve Solo")).toBeTruthy();

        // Acme: 2 trucks -> fleet form required but missing, plus Truck Two has no VIN
        // -> error status. Eve: 1 truck (fleet form not required) + insurance filed -> OK.
        expect(screen.getAllByTestId("CloseIcon").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByTestId("CheckIcon").length).toBeGreaterThanOrEqual(1);
    });

    it("expands an entity to show its trucks and vitals", () => {
        render(
            <DriverForms data={[carla, dave, eve]} all_forms={[insurance, fleetForm]} mode="oo" />,
        );

        expect(screen.queryByText("Truck One")).toBeNull();
        const expanders = screen.getAllByRole("button", {expanded: false});
        fireEvent.click(expanders[0]!); // Acme sorts before Eve Solo

        expect(screen.getByText("Truck One")).toBeTruthy();
        expect(screen.getByText("Truck Two")).toBeTruthy();
        expect(screen.getAllByText(/Plate PLT-1/).length).toBeGreaterThanOrEqual(1);
    });

    it("removing an entity filing goes through the destructive confirm", () => {
        render(
            <DriverForms data={[carla, dave, eve]} all_forms={[insurance, fleetForm]} mode="oo" />,
        );

        // Checkbox order: per entity row, forms in all_forms order (Fleet Contract
        // sorts... columns follow all_forms prop order: [insurance, fleetForm]).
        // Acme row: [insurance (checked), fleet (unchecked)].
        const checkboxes = screen.getAllByRole("checkbox");
        expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
        fireEvent.click(checkboxes[0]!);

        expect(confirmDestructive).toHaveBeenCalledTimes(1);
        const args = confirmDestructive.mock.calls[0]![0] as {
            title: string;
            onConfirm: () => void;
        };
        expect(args.title).toBe("Remove filing");
        args.onConfirm();
        // Filing sits on Carla (ID 3), the primary/holder driver.
        expect(mutations.del.mutate).toHaveBeenCalledWith({driverId: 3, formId: 201});
    });
});

// ---------------------------------------------------------------------------
// DriverFormsExpiringSoon
// ---------------------------------------------------------------------------

const expiringData = {
    daysAhead: 30,
    w2Groups: [
        {
            driverId: 1,
            title: "Alice Anderson",
            rows: [
                {
                    formId: 101,
                    formName: "Medical Card",
                    filed: FILED,
                    endDate: "2026-08-10T05:00:00.000Z",
                    cadence: "EXPIRATION_DATE",
                    required: true,
                    filer: null,
                    driverId: 1,
                    driverName: "Alice Anderson",
                },
                {
                    formId: -1000,
                    formName: "Driver license (CDL)",
                    filed: "",
                    endDate: "2026-08-12T05:00:00.000Z",
                    cadence: "EXPIRATION_DATE",
                    required: true,
                    filer: null,
                    driverId: 1,
                    driverName: "Alice Anderson",
                },
            ],
        },
    ],
    ooGroups: [
        {
            entityKey: "s:5",
            title: "Eve Solo",
            rows: [
                {
                    formId: 201,
                    formName: "Insurance",
                    filed: FILED,
                    endDate: "2026-08-20T05:00:00.000Z",
                    cadence: "ROLLING_MONTHS",
                    required: true,
                    filer: "Carl",
                    driverId: 5,
                    driverName: "Eve Solo",
                },
            ],
        },
    ],
};

describe("DriverFormsExpiringSoon", () => {
    it("renders W2 and OO groups with rows, license placeholder and cadence labels", () => {
        queryHolder.value = {
            data: expiringData,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        };
        render(<DriverFormsExpiringSoon />);

        expect(screen.getByText("Alice Anderson")).toBeTruthy();
        // Solo OO entities render the driver name as group title AND in the Driver column.
        expect(screen.getAllByText("Eve Solo")).toHaveLength(2);
        expect(screen.getByText("Medical Card")).toBeTruthy();
        expect(screen.getByText("Driver license (CDL)")).toBeTruthy();
        // License rows have no filed date.
        expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("EXPIRATION DATE").length).toBe(2);
        expect(screen.getByText("ROLLING MONTHS")).toBeTruthy();
        expect(screen.getAllByText(/Soonest:/).length).toBe(2);
        expect(screen.getByText("Carl")).toBeTruthy();
    });

    it("collapses a group and toggles all groups", () => {
        queryHolder.value = {
            data: expiringData,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        };
        render(<DriverFormsExpiringSoon />);

        // All groups start expanded, so the bulk toggle offers "Collapse all".
        expect(screen.getByRole("button", {name: "Collapse all"})).toBeTruthy();

        expect(screen.getByText("Medical Card")).toBeTruthy();
        const expanded = screen.getAllByRole("button", {expanded: true});
        fireEvent.click(expanded[0]!);
        expect(screen.queryByText("Medical Card")).toBeNull();

        // With one group collapsed the bulk toggle flips to "Expand all".
        fireEvent.click(screen.getByRole("button", {name: "Expand all"}));
        expect(screen.getByText("Medical Card")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", {name: "Collapse all"}));
        expect(screen.queryByText("Insurance")).toBeNull();
    });

    it("shows the empty state and wires up refresh", () => {
        const refetch = vi.fn();
        queryHolder.value = {
            data: {daysAhead: 30, w2Groups: [], ooGroups: []},
            isLoading: false,
            isFetching: false,
            refetch,
        };
        render(<DriverFormsExpiringSoon />);

        expect(
            screen.getByText("No forms or licenses expiring in the next 30 days."),
        ).toBeTruthy();
        fireEvent.click(screen.getByRole("button", {name: "Refresh"}));
        expect(refetch).toHaveBeenCalledTimes(1);
    });
});
