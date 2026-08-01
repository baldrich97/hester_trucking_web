import {describe, expect, it, vi, beforeEach} from "vitest";
import React from "react";
import {render, screen} from "@testing-library/react";
import {toast} from "react-toastify";
import {
    CLOSED_JOB_REMATCH_WARNING,
    DAILY_PRINTED_WARNING,
    WEEKLY_PRINTED_WARNING,
} from "../../src/constants/loadWarnings";
import {showLoadWarnings} from "../../src/utils/loadWarningToasts";

vi.mock("react-toastify", () => ({
    toast: vi.fn(),
}));

vi.mock("next/link", () => ({
    default: ({children, href}: {children: React.ReactNode; href: unknown}) => (
        <a href={typeof href === "object" ? JSON.stringify(href) : String(href)}>{children}</a>
    ),
}));

describe("showLoadWarnings", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns false when warnings are empty or missing", () => {
        expect(showLoadWarnings(null)).toBe(false);
        expect(showLoadWarnings([])).toBe(false);
        expect(toast).not.toHaveBeenCalled();
    });

    it("returns false for unrecognized warning payloads", () => {
        expect(showLoadWarnings(["something else"])).toBe(false);
        expect(toast).not.toHaveBeenCalled();
    });

    it("LW-U1: shows daily printed warning toast with week and driver", () => {
        const warnings = [DAILY_PRINTED_WARNING, "2099-W10", "42"];
        expect(showLoadWarnings(warnings)).toBe(true);
        expect(toast).toHaveBeenCalledTimes(1);
        expect(toast).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({type: "warning", position: "top-left"}),
        );
        const toastBody = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0];
        const {container} = render(toastBody);
        expect(screen.getByText(/daily.*already been printed/i)).toBeInTheDocument();
        expect(container.innerHTML).toContain("2099-W10");
        expect(container.innerHTML).toContain("/dailies");
    });

    it("LW-U2: shows weekly printed warning toast with week and customer", () => {
        const warnings = [WEEKLY_PRINTED_WARNING, "2099-W11", "7"];
        expect(showLoadWarnings(warnings)).toBe(true);
        expect(toast).toHaveBeenCalledTimes(1);
        const toastBody = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0];
        const {container} = render(toastBody);
        expect(screen.getByText(/weekly.*already been printed/i)).toBeInTheDocument();
        expect(container.innerHTML).toContain("2099-W11");
        expect(container.innerHTML).toContain("/weeklies");
    });

    it("LW-U3: shows closed-job rematch warning toast with week and customer", () => {
        const warnings = [CLOSED_JOB_REMATCH_WARNING, "2099-W12", "99"];
        expect(showLoadWarnings(warnings)).toBe(true);
        expect(toast).toHaveBeenCalledTimes(1);
        const toastBody = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0];
        const {container} = render(toastBody);
        expect(screen.getByText(/closed or paid out job/i)).toBeInTheDocument();
        expect(container.innerHTML).toContain("2099-W12");
        expect(container.innerHTML).toContain("/weeklies");
    });

    it("LW-U4: daily printed warning takes priority over other warnings in the array", () => {
        const warnings = [CLOSED_JOB_REMATCH_WARNING, "2099-W13", "1", DAILY_PRINTED_WARNING, "2099-W14", "2"];
        expect(showLoadWarnings(warnings)).toBe(true);
        const toastBody = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0];
        const {container} = render(toastBody);
        expect(screen.getByText(/already been printed/i)).toBeInTheDocument();
        expect(container.innerHTML).toContain("2099-W14");
        expect(container.innerHTML).not.toContain("2099-W13");
    });
});
