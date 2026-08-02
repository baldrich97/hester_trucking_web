import {describe, expect, it} from "vitest";
import {LoadsModel} from "../../prisma/zod";

/**
 * Regression coverage for the Load form validation schema.
 *
 * The Load form (react-hook-form + zodResolver) holds untouched numeric inputs
 * as empty strings. Every numeric field a user can type into must therefore
 * coerce, otherwise submit fails silently (no visible field error).
 * DriverRate was missing the @zod.custom(z.coerce.number()) annotation, which
 * broke every manual (non-prefilled) load submit.
 */
describe("LoadsModel form validation", () => {
    const validCreateInput = {
        StartDate: new Date("2026-01-05"),
        Created: new Date(),
        TicketNumber: 999123,
        CustomerID: 1,
        Week: "2026-W02",
    };

    const createSchema = LoadsModel.omit({ID: true});

    it("accepts a minimal create payload", () => {
        expect(createSchema.safeParse(validCreateInput).success).toBe(true);
    });

    it("coerces string values for every user-editable numeric field", () => {
        const result = createSchema.safeParse({
            ...validCreateInput,
            Weight: "20",
            Hours: "8",
            TotalRate: "5.5",
            TotalAmount: "110",
            TruckRate: "3.25",
            MaterialRate: "2.75",
            DriverRate: "4.15",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.DriverRate).toBe(4.15);
            expect(result.data.TruckRate).toBe(3.25);
            expect(result.data.Weight).toBe(20);
        }
    });

    it("coerces the empty string an untouched rate input produces", () => {
        // RHF text inputs yield "" when untouched; this must not reject the form.
        const result = createSchema.safeParse({
            ...validCreateInput,
            DriverRate: "",
            TruckRate: "",
            MaterialRate: "",
        });
        expect(result.success).toBe(true);
    });

    it("still rejects a missing customer", () => {
        const {CustomerID: _omitted, ...rest} = validCreateInput;
        expect(createSchema.safeParse(rest).success).toBe(false);
    });
});
