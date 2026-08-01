import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import React from "react";

vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useQuery: vi.fn(() => ({data: {active: false}, isLoading: false})),
        useMutation: vi.fn(() => ({mutate: vi.fn(), isLoading: false})),
    },
}));

import AuditReportPage from "../../src/components/objects/AuditReportPage";

describe("AuditReportPage", () => {
    it("shows gated message when cutover inactive", () => {
        render(<AuditReportPage mode="source" />);
        expect(screen.getByText(/not available until the Sources cutover/i)).toBeInTheDocument();
    });
});
