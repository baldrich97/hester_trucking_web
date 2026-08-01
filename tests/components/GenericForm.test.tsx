import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import React from "react";
import {useForm} from "react-hook-form";
import GenericForm from "../../src/elements/GenericForm";

function FormHarness({
    fields,
    errors = {},
}: {
    fields: Parameters<typeof GenericForm>[0]["fields"];
    errors?: Record<string, {type: string}>;
}) {
    const {control} = useForm({defaultValues: {name: "", notes: ""}});
    return (
        <GenericForm
            control={control}
            fields={fields}
            errors={errors}
            submitLabel="Save"
        />
    );
}

describe("GenericForm", () => {
    it("renders textfield fields with labels", () => {
        render(
            <FormHarness
                fields={[
                    {
                        name: "name",
                        type: "textfield",
                        size: 12,
                        required: true,
                        label: "Name",
                    },
                ]}
            />,
        );
        expect(screen.getByLabelText("Name")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Save"})).toBeInTheDocument();
    });

    it("shows validation error message when configured", () => {
        render(
            <FormHarness
                fields={[
                    {
                        name: "name",
                        type: "textfield",
                        size: 12,
                        required: true,
                        label: "Name",
                        shouldErrorOn: ["invalid_type"],
                        errorMessage: "Name is required.",
                    },
                ]}
                errors={{name: {type: "invalid_type"}}}
            />,
        );
        expect(screen.getByText("Name is required.")).toBeInTheDocument();
    });
});
