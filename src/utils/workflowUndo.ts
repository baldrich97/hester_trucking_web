/** Confirm-dialog copy for reversing invoice / sheet / pay actions. */

export type InvoiceJobPayCounts = {
    onPaystub: number;
    paidOut: number;
};

export function countInvoiceJobPayState(
    weeklies: Array<{Jobs?: Array<{PaidOut?: boolean | null; PayStubID?: number | null}> | null} | null> | null | undefined,
): InvoiceJobPayCounts {
    let onPaystub = 0;
    let paidOut = 0;
    for (const weekly of weeklies ?? []) {
        for (const job of weekly?.Jobs ?? []) {
            if (job.PayStubID != null) {
                onPaystub += 1;
            } else if (job.PaidOut) {
                paidOut += 1;
            }
        }
    }
    return {onPaystub, paidOut};
}

export function buildInvoiceDeleteMessage(options: {
    paid?: boolean | null;
    printed?: boolean | null;
    consolidated?: boolean | null;
    consolidatedId?: number | null;
    onPaystub?: number;
    paidOut?: number;
}): string {
    const parts: string[] = [
        "This permanently deletes the invoice.",
        "Associated weeklies and loads will be unlinked so they can be put on a new invoice.",
        "Weeklies stay closed — you do not need to re-close them to reinvoice.",
        "Driver pay (paystubs / paid-out jobs) is not changed.",
    ];
    if (options.paid) {
        parts.push("This invoice is marked paid.");
    }
    if (options.printed) {
        parts.push("This invoice has been printed.");
    }
    if (options.consolidated) {
        parts.push("This is a consolidated invoice. Child invoices will become standalone again.");
    }
    if (options.consolidatedId != null) {
        parts.push("This invoice is part of a consolidated invoice.");
    }
    if ((options.onPaystub ?? 0) > 0) {
        parts.push(
            `${options.onPaystub} related job(s) are already on a paystub. Deleting this invoice does not unpay those jobs.`,
        );
    } else if ((options.paidOut ?? 0) > 0) {
        parts.push(
            `${options.paidOut} related job(s) are already marked paid out. Deleting this invoice does not unpay those jobs.`,
        );
    }
    parts.push("Continue?");
    return parts.join(" ");
}

export function buildInvoiceUnpayMessage(): string {
    return [
        "This marks the invoice unpaid.",
        "The invoice stays on file; weeklies and loads stay linked to it.",
        "If this is a consolidated invoice, child invoices will also be marked unpaid.",
        "Continue?",
    ].join(" ");
}

export function buildPaystubDeleteMessage(options: {
    deposited?: boolean;
    printed?: boolean;
}): string {
    const parts: string[] = [
        "This permanently deletes the paystub.",
        "Jobs on it will be marked unpaid and can be added to a new paystub or marked paid on the daily sheet.",
    ];
    if (options.deposited) {
        parts.push("This paystub has a deposit date.");
    }
    if (options.printed) {
        parts.push("This paystub has been printed.");
    }
    parts.push("Continue?");
    return parts.join(" ");
}

export function buildLoadDeleteMessage(options: {
    invoiced?: boolean;
    paidOut?: boolean;
}): string {
    if (options.invoiced) {
        return [
            "This load is on an invoice and cannot be deleted yet.",
            "Delete that invoice first so the load is unlinked, then try again.",
        ].join(" ");
    }
    if (options.paidOut) {
        return [
            "This load's job is marked paid out and cannot be deleted yet.",
            "Delete the paystub or unmark the job as paid out first, then try again.",
        ].join(" ");
    }
    return [
        "This permanently deletes the load (ticket).",
        "Job and weekly totals will recount from remaining loads.",
        "To redo this ticket you will need to enter it again.",
        "Continue?",
    ].join(" ");
}

export function buildCloseWeeklyMessage(): string {
    return [
        "This closes the weekly and locks its revenue.",
        "Matching new or edited loads will go on a new weekly until you reopen this one.",
        "Closing is required before this weekly can be invoiced.",
        "Jobs do not have to be closed first. You can still close jobs afterward to lock their revenues and mark them paid out.",
        "You can reopen it later from this sheet if it is not invoiced.",
        "Continue?",
    ].join(" ");
}

export function buildReopenWeeklyMessage(): string {
    return [
        "This reopens the weekly (clears saved revenue).",
        "Matching new or edited loads can join this weekly again.",
        "It will drop off the invoice picker until you close it.",
        "This does not change load type. If you mass-edit loads to a different load type, they will rematch onto a different weekly.",
        "Continue?",
    ].join(" ");
}

export function buildCloseJobMessage(): string {
    return [
        "This closes the job and locks trucking/company revenue.",
        "Matching new or edited loads will go on a new job until you reopen this one.",
        "The weekly can already be closed or invoiced — that does not block closing this job.",
        "Closing the job is not required to invoice. It is required to mark the job paid out on this sheet. Paystubs can still include jobs that are not closed.",
        "You can reopen this job later if it is not paid out.",
        "Continue?",
    ].join(" ");
}

export function buildReopenJobMessage(): string {
    return [
        "This reopens the job (clears saved revenues).",
        "Matching loads can reuse this job instead of creating a new one — but only if the weekly is also open.",
        "The daily sheet will go back to closing the job, not marking it paid out.",
        "This does not unpay the job.",
        "Continue?",
    ].join(" ");
}

export function buildMarkJobPaidOutMessage(): string {
    return [
        "This marks the job paid out without creating a paystub.",
        "Loads on this job cannot be edited until you unmark paid out (or, if it is later put on a paystub, until that paystub is deleted).",
        "Continue?",
    ].join(" ");
}

export function buildUnmarkJobPaidOutMessage(): string {
    return [
        "This marks the job unpaid.",
        "Loads on this job can be edited again, and it can be added to a paystub.",
        "If this job is on a paystub, delete the paystub instead.",
        "Continue?",
    ].join(" ");
}
