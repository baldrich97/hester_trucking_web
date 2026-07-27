import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import {formatDateToWeek} from "../../src/utils/UtilityFunctions";

const useSourcesCutoverMock = vi.fn(() => ({
    active: true,
    newLoadTypeIdThreshold: 10000,
    configMismatch: false,
    serverActive: true,
    clientForce: false,
}));
const useQueryMock = vi.fn();
const genericFormProps = vi.fn();

vi.mock("../../src/hooks/useSourcesCutover", () => ({
    useSourcesCutover: () => useSourcesCutoverMock(),
}));

vi.mock("next/router", () => ({
    useRouter: () => ({asPath: "/loads", push: vi.fn(), replace: vi.fn()}),
}));

vi.mock("react-toastify", () => ({toast: {success: vi.fn(), error: vi.fn()}}));
vi.mock("../../src/utils/appConfirm", () => ({confirmDestructive: vi.fn()}));
vi.mock("jquery", () => ({default: vi.fn()}));

vi.mock("../../src/elements/GenericForm", () => ({
    default: (props: Record<string, unknown>) => {
        genericFormProps(props);
        return <div data-testid="generic-form">Load Form</div>;
    },
}));

vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useQuery: (...args: unknown[]) => useQueryMock(...args),
        useMutation: () => ({mutate: vi.fn(), mutateAsync: vi.fn(), isLoading: false}),
    },
}));

import Load from "../../src/components/objects/Load";

const openJob = {
    JobID: 100,
    CustomerID: 1,
    LoadTypeID: 116,
    DeliveryLocationID: 2,
    CustomerName: "Acme",
    LoadTypeDescription: "ASPHALT (FRUITLAND)",
    DeliveryLocationDescription: "Site A",
    CompanyRate: 15,
    TruckingRate: 10,
    MaterialRate: 5,
    DriverRate: 8,
    Week: formatDateToWeek(new Date()),
    LastStartDate: null,
};

const driverWeekDefaults = {
    DriverID: 5,
    Week: formatDateToWeek(new Date()),
};

function setupTrpcQueries(openJobs: typeof openJob[] = [openJob]) {
    useQueryMock.mockImplementation((key: unknown[]) => {
        const path = Array.isArray(key) ? key[0] : key;
        if (path === "loads.openLegacyJobs") {
            return {data: openJobs, isLoading: false};
        }
        if (path === "loadtypes.search") {
            return {data: [], isLoading: false, refetch: vi.fn()};
        }
        if (path === "states.getAll") {
            return {data: [], isLoading: false};
        }
        if (path === "deliverylocations.search" || path === "trucksdriven.search" || path === "sources.search") {
            return {data: [], isLoading: false, refetch: vi.fn()};
        }
        return {data: [], isLoading: false};
    });
}

describe("Load cutover UI", () => {
    it("shows legacy open jobs banner when driver/week set and jobs exist", () => {
        useSourcesCutoverMock.mockReturnValue({
            active: true,
            newLoadTypeIdThreshold: 10000,
            configMismatch: false,
            serverActive: true,
            clientForce: false,
        });
        setupTrpcQueries([openJob]);
        genericFormProps.mockClear();
        render(<Load initialLoad={driverWeekDefaults as never} />);
        expect(screen.getByText(/open legacy job/i)).toBeInTheDocument();
        expect(screen.getByText("New work instead")).toBeInTheDocument();
        expect(screen.getByText("ASPHALT (FRUITLAND)")).toBeInTheDocument();
        expect(genericFormProps).toHaveBeenCalled();
        const props = genericFormProps.mock.calls.at(-1)![0] as {
            loadTypeEra: string;
            fields: {name: string}[];
        };
        expect(props.loadTypeEra).toBe("legacy");
        expect(props.fields.some((f) => f.name === "SourceID")).toBe(false);
    });

    it("uses new-era load types and hides legacy banner when no open jobs", () => {
        useSourcesCutoverMock.mockReturnValue({
            active: true,
            newLoadTypeIdThreshold: 10000,
            configMismatch: false,
            serverActive: true,
            clientForce: false,
        });
        setupTrpcQueries([]);
        genericFormProps.mockClear();
        render(<Load initialLoad={driverWeekDefaults as never} />);
        expect(screen.queryByText(/open job\(s\) for this driver/i)).not.toBeInTheDocument();
        expect(screen.getByText(/No open legacy jobs/i)).toBeInTheDocument();
        const props = genericFormProps.mock.calls.at(-1)![0] as {
            loadTypeEra: string;
            fields: {name: string}[];
        };
        expect(props.loadTypeEra).toBe("new");
        expect(props.fields.some((f) => f.name === "SourceID")).toBe(true);
    });

    it("passes empty load-type client data when cutover is active (era-aware fetch)", () => {
        useSourcesCutoverMock.mockReturnValue({
            active: true,
            newLoadTypeIdThreshold: 10000,
            configMismatch: false,
            serverActive: true,
            clientForce: false,
        });
        setupTrpcQueries([]);
        genericFormProps.mockClear();
        render(<Load initialLoad={driverWeekDefaults as never} />);
        const props = genericFormProps.mock.calls.at(-1)![0] as {
            selectData: {key: string; data: unknown[]}[];
        };
        const loadTypes = props.selectData.find((row) => row.key === "LoadTypeID");
        expect(loadTypes?.data).toEqual([]);
    });

    it("hides legacy banner when cutover inactive", () => {
        useSourcesCutoverMock.mockReturnValue({
            active: false,
            newLoadTypeIdThreshold: 10000,
            configMismatch: false,
            serverActive: false,
            clientForce: false,
        });
        setupTrpcQueries([openJob]);
        render(<Load initialLoad={driverWeekDefaults as never} />);
        expect(screen.queryByText(/open job/i)).not.toBeInTheDocument();
    });

    it("shows server/client cutover mismatch warning", () => {
        useSourcesCutoverMock.mockReturnValue({
            active: true,
            newLoadTypeIdThreshold: 10000,
            configMismatch: true,
            serverActive: false,
            clientForce: true,
        });
        setupTrpcQueries([]);
        render(<Load initialLoad={driverWeekDefaults as never} />);
        expect(screen.getByText(/NEXT_PUBLIC_SOURCES_CUTOVER_FORCE/i)).toBeInTheDocument();
    });

    it("passes CustomerID to openLegacyJobs when a customer is selected", () => {
        useSourcesCutoverMock.mockReturnValue({
            active: true,
            newLoadTypeIdThreshold: 10000,
            configMismatch: false,
            serverActive: true,
            clientForce: false,
        });
        setupTrpcQueries([openJob]);
        useQueryMock.mockClear();
        render(
            <Load
                initialLoad={
                    {...driverWeekDefaults, CustomerID: openJob.CustomerID} as never
                }
            />,
        );
        const openJobsCall = useQueryMock.mock.calls.find(
            (call) => Array.isArray(call[0]) && call[0][0] === "loads.openLegacyJobs",
        );
        expect(openJobsCall?.[0]?.[1]).toMatchObject({
            DriverID: driverWeekDefaults.DriverID,
            CustomerID: openJob.CustomerID,
            Week: driverWeekDefaults.Week,
        });
    });

    it("marks the clicked open job row as active", () => {
        useSourcesCutoverMock.mockReturnValue({
            active: true,
            newLoadTypeIdThreshold: 10000,
            configMismatch: false,
            serverActive: true,
            clientForce: false,
        });
        setupTrpcQueries([openJob]);
        render(<Load initialLoad={driverWeekDefaults as never} />);
        fireEvent.click(screen.getByText("ASPHALT (FRUITLAND)"));
        expect(screen.getByText("Active")).toBeInTheDocument();
        expect(screen.getByRole("row", {selected: true})).toBeInTheDocument();
    });

    it("does not apply week filter until the week field is touched", () => {
        useSourcesCutoverMock.mockReturnValue({
            active: true,
            newLoadTypeIdThreshold: 10000,
            configMismatch: false,
            serverActive: true,
            clientForce: false,
        });
        setupTrpcQueries([openJob]);
        useQueryMock.mockClear();
        render(<Load initialLoad={{DriverID: driverWeekDefaults.DriverID} as never} />);
        const openJobsCall = useQueryMock.mock.calls.find(
            (call) => Array.isArray(call[0]) && call[0][0] === "loads.openLegacyJobs",
        );
        expect(openJobsCall?.[0]?.[1]).toMatchObject({
            DriverID: driverWeekDefaults.DriverID,
        });
        expect(openJobsCall?.[0]?.[1]).not.toHaveProperty("Week");
    });
});
