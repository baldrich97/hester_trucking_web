import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import PaginatedSheetNav from "../../src/components/PaginatedSheetNav";

describe("PaginatedSheetNav", () => {
    it("navigates forward and backward through pages", () => {
        const onPageChange = vi.fn();
        const {rerender} = render(
            <PaginatedSheetNav page={1} grabCount={25} onPageChange={onPageChange} />,
        );

        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        expect(onPageChange).toHaveBeenCalledWith(2);

        onPageChange.mockClear();
        rerender(<PaginatedSheetNav page={2} grabCount={25} onPageChange={onPageChange} />);

        fireEvent.click(screen.getByRole("button", {name: "Previous page"}));
        expect(onPageChange).toHaveBeenCalledWith(1);

        expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    });

    it("disables back buttons on the first page", () => {
        render(<PaginatedSheetNav page={1} grabCount={25} onPageChange={vi.fn()} />);
        expect(screen.getByRole("button", {name: "Previous page"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "First page"})).toBeDisabled();
    });

    it("disables forward buttons on the last page", () => {
        render(<PaginatedSheetNav page={3} grabCount={25} onPageChange={vi.fn()} />);
        expect(screen.getByRole("button", {name: "Next page"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Last page"})).toBeDisabled();
    });
});
