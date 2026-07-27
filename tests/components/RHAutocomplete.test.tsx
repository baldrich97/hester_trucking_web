import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import React from "react";
import {useForm} from "react-hook-form";

vi.mock("@mui/material/Autocomplete", () => ({
    default: ({
        renderInput,
    }: {
        renderInput: (params: {inputProps?: Record<string, unknown>}) => React.ReactNode;
    }) => <div>{renderInput({inputProps: {"aria-label": "Customer"}})}</div>,
}));

vi.mock("../../src/utils/trpc", () => ({
    trpc: {
        useQuery: () => ({data: undefined, isLoading: false}),
    },
}));

import RHAutocomplete from "../../src/elements/RHAutocomplete";

function AutocompleteHarness({
    loadTypeEra,
    openJobLoadTypeIDs,
}: {
    loadTypeEra?: "legacy" | "new" | "all";
    openJobLoadTypeIDs?: number[];
}) {
    const {control} = useForm({defaultValues: {CustomerID: null, LoadTypeID: null}});
    return (
        <RHAutocomplete
            name={loadTypeEra ? "LoadTypeID" : "CustomerID"}
            control={control}
            label={loadTypeEra ? "Load Type" : "Customer"}
            data={loadTypeEra ? [{ID: 116, Description: "ASPHALT"}] : [{ID: 1, Name: "Acme"}]}
            optionLabel={loadTypeEra ? "Description" : "Name"}
            optionValue="ID"
            searchQuery={loadTypeEra ? "loadtypes" : "customers"}
            loadTypeEra={loadTypeEra}
            openJobLoadTypeIDs={openJobLoadTypeIDs}
        />
    );
}

describe("RHAutocomplete", () => {
    it("renders labeled autocomplete input", () => {
        render(<AutocompleteHarness />);
        expect(screen.getByLabelText("Customer")).toBeInTheDocument();
    });

    it("renders with loadTypeEra and open job props", () => {
        render(<AutocompleteHarness loadTypeEra="new" openJobLoadTypeIDs={[116]} />);
        expect(screen.getByLabelText("Load Type")).toBeInTheDocument();
    });
});
