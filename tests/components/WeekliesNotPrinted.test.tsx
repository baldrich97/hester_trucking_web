import {describe, expect, it, vi, beforeEach} from "vitest";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import React from "react";

const useQueryMock = vi.fn();

vi.mock("next/router", () => ({
    useRouter: () => ({isReady: true, query: {}}),
}));

vi.mock("elements/LoadingModal", () => ({
    default: () => null,
}));

vi.mock("../../src/components/objects/WeeklySheet", () => ({
    default: ({weekly}: {weekly: {Customers: {Name: string}}}) => (
        <div data-testid="weekly-sheet">{weekly.Customers.Name}</div>
    ),
}));

vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useQuery: (...args: unknown[]) => useQueryMock(...args),
    },
}));

import WeekliesNotPrinted from "../../src/pages/weeklies/not_printed";

function makeWeekly(id: number, name: string) {
    return {
        ID: id,
        Week: "2026-W30",
        Customers: {Name: name},
        Jobs: [{Loads: [{ID: 1}]}],
    };
}

describe("Weeklies not_printed page", () => {
    beforeEach(() => {
        useQueryMock.mockReset();
    });

    it("shows page 1 data again after navigating back from page 2", async () => {
        useQueryMock.mockImplementation((key: unknown[]) => {
            const page = (key?.[1] as {page?: number})?.page ?? 1;
            if (page === 1) {
                return {
                    data: {
                        data: [makeWeekly(1, "Alpha Customer")],
                        warnings: ["25"],
                    },
                    isLoading: false,
                    isFetching: false,
                    refetch: vi.fn(),
                };
            }
            return {
                data: {
                    data: [makeWeekly(11, "Zulu Customer")],
                    warnings: ["25"],
                },
                isLoading: false,
                isFetching: false,
                refetch: vi.fn(),
            };
        });

        render(<WeekliesNotPrinted />);
        await waitFor(() => {
            expect(screen.getByText("Alpha Customer")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() => {
            expect(screen.getByText("Zulu Customer")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", {name: "Previous page"}));
        await waitFor(() => {
            expect(screen.getByText("Alpha Customer")).toBeInTheDocument();
        });

        const pagesRequested = useQueryMock.mock.calls.map(
            (call) => (call[0]?.[1] as {page?: number})?.page,
        );
        expect(pagesRequested).toContain(1);
        expect(pagesRequested).toContain(2);
    });
});
