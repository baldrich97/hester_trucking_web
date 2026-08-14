import {describe, expect, it} from "vitest";
import {
    buildCloseJobMessage,
    buildCloseWeeklyMessage,
    buildInvoiceDeleteMessage,
    buildInvoiceUnpayMessage,
    buildLoadDeleteMessage,
    buildMarkJobPaidOutMessage,
    buildPaystubDeleteMessage,
    buildReopenJobMessage,
    buildReopenWeeklyMessage,
    buildUnmarkJobPaidOutMessage,
    countInvoiceJobPayState,
} from "../../src/utils/workflowUndo";

describe("workflowUndo copy", () => {
    it("counts paystub vs paid-out jobs on invoice weeklies", () => {
        expect(
            countInvoiceJobPayState([
                {Jobs: [{PaidOut: true, PayStubID: 9}, {PaidOut: true, PayStubID: null}, {PaidOut: false}]},
            ]),
        ).toEqual({onPaystub: 1, paidOut: 1});
    });

    it("warns when deleting a paid invoice with jobs on a paystub", () => {
        const message = buildInvoiceDeleteMessage({paid: true, onPaystub: 2});
        expect(message).toMatch(/permanently deletes the invoice/i);
        expect(message).toMatch(/stay closed/i);
        expect(message).toMatch(/marked paid/i);
        expect(message).toMatch(/2 related job/);
    });

    it("blocks load delete copy when invoiced or paid out", () => {
        expect(buildLoadDeleteMessage({invoiced: true})).toMatch(/on an invoice/i);
        expect(buildLoadDeleteMessage({paidOut: true})).toMatch(/paid out/i);
        expect(buildLoadDeleteMessage({})).toMatch(/permanently deletes the load/i);
    });

    it("explains that reopen weekly does not keep a load-type change on the same weekly", () => {
        expect(buildReopenWeeklyMessage()).toMatch(/different load type/i);
        expect(buildReopenWeeklyMessage()).toMatch(/invoice picker/i);
    });

    it("covers unpay, paystub, close, and job undo copy", () => {
        expect(buildInvoiceUnpayMessage()).toMatch(/stays on file/i);
        expect(buildPaystubDeleteMessage({deposited: true, printed: true})).toMatch(
            /permanently deletes the paystub/i,
        );
        expect(buildCloseWeeklyMessage()).toMatch(/jobs do not have to be closed first/i);
        expect(buildCloseJobMessage()).toMatch(/does not block closing this job/i);
        expect(buildCloseJobMessage()).toMatch(/paystubs can still include/i);
        expect(buildReopenJobMessage()).toMatch(/does not unpay/i);
        expect(buildMarkJobPaidOutMessage()).toMatch(/without creating a paystub/i);
        expect(buildUnmarkJobPaidOutMessage()).toMatch(/delete the paystub instead/i);
    });
});
