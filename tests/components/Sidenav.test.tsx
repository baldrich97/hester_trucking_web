import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import React from "react";

const useSourcesCutoverMock = vi.fn(() => ({active: false, newLoadTypeIdThreshold: 10000}));

vi.mock("../../src/hooks/useSourcesCutover", () => ({
    useSourcesCutover: () => useSourcesCutoverMock(),
}));

vi.mock("next/router", () => ({
    useRouter: () => ({
        asPath: "/loads",
        push: vi.fn(),
        replace: vi.fn(),
    }),
}));

vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useQuery: vi.fn(() => ({data: 0})),
    },
}));

import Sidenav from "../../src/components/layout/Sidenav";

describe("Sidenav cutover gate", () => {
    it("hides Sources and Reports when cutover inactive", () => {
        useSourcesCutoverMock.mockReturnValue({active: false, newLoadTypeIdThreshold: 10000});
        render(<Sidenav open={true} toggleDrawer={() => undefined} />);
        expect(screen.queryByText("Sources")).not.toBeInTheDocument();
        expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    });

    it("shows Sources and Reports when cutover active", () => {
        useSourcesCutoverMock.mockReturnValue({active: true, newLoadTypeIdThreshold: 10000});
        render(<Sidenav open={true} toggleDrawer={() => undefined} />);
        expect(screen.getByText("Sources")).toBeInTheDocument();
        expect(screen.getByText("Reports")).toBeInTheDocument();
    });
});
