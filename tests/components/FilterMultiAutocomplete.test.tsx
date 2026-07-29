import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import FilterMultiAutocomplete from "../../src/elements/FilterMultiAutocomplete";

type Opt = {id: number; label: string};

const options: Opt[] = [
    {id: 1, label: "Alpha Driver"},
    {id: 2, label: "Beta Driver"},
];

describe("FilterMultiAutocomplete", () => {
    it("renders label and clear-all when items are selected", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <FilterMultiAutocomplete
                label="Drivers"
                options={options}
                value={[options[0]!]}
                onChange={onChange}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) => a.id === b.id}
            />,
        );

        expect(screen.getByLabelText("Drivers")).toBeInTheDocument();
        expect(screen.getByText("Alpha Driver")).toBeInTheDocument();

        await user.click(screen.getByLabelText("Clear all"));
        expect(onChange).toHaveBeenCalledWith([]);
    });
});
