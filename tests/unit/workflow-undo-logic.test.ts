import {describe, expect, it} from "vitest";
import {runAllWorkflows} from "./workflow-undo-logic.mjs";

describe("workflow undo mock walks", () => {
    it("keeps invoice, weekly, job, paystub, and load workflows consistent", () => {
        expect(runAllWorkflows()).toBe("ok");
    });
});
