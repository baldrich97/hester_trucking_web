/**
 * In-memory walk of invoice / weekly / job / paystub / load undo workflows.
 * Mirrors the production mutation rules in src/server/router/* and loadRematch.ts.
 * Runnable with `node tests/unit/workflow-undo-logic.mjs` (no npm).
 */
import {strict as assert} from "assert";
import {pathToFileURL} from "url";

function fail(message) {
    const err = new Error(message);
    err.code = "BAD_REQUEST";
    throw err;
}

function notFound(message) {
    const err = new Error(message);
    err.code = "NOT_FOUND";
    throw err;
}

function createStore() {
    return {
        nextId: 1,
        invoices: [],
        weeklies: [],
        jobs: [],
        loads: [],
        payStubs: [],
    };
}

function seedGraph(store, overrides = {}) {
    const id = () => store.nextId++;
    const weekly = {
        ID: id(),
        CustomerID: 1,
        Week: "2099-W05",
        LoadTypeID: 2,
        DeliveryLocationID: 5,
        Revenue: 340,
        TotalWeight: 20,
        InvoiceID: null,
        CompanyRate: 17,
        ...overrides.weekly,
    };
    const job = {
        ID: id(),
        WeeklyID: weekly.ID,
        DriverID: 9,
        CustomerID: 1,
        LoadTypeID: 2,
        DeliveryLocationID: 5,
        PaidOut: false,
        PayStubID: null,
        TruckingRevenue: null,
        CompanyRevenue: null,
        ...overrides.job,
    };
    const load = {
        ID: id(),
        JobID: job.ID,
        CustomerID: 1,
        Week: "2099-W05",
        LoadTypeID: 2,
        DeliveryLocationID: 5,
        InvoiceID: null,
        Invoiced: false,
        Weight: 20,
        TotalRate: 17,
        ...overrides.load,
    };
    store.weeklies.push(weekly);
    store.jobs.push(job);
    store.loads.push(load);
    return {weekly, job, load};
}

function weekliesGetByCustomer(store, customerId) {
    return store.weeklies.filter(
        (weekly) =>
            weekly.CustomerID === customerId &&
            weekly.InvoiceID == null &&
            weekly.Revenue != null &&
            store.jobs.some(
                (job) => job.WeeklyID === weekly.ID && store.loads.some((load) => load.JobID === job.ID),
            ),
    );
}

function invoicesPut(store, input) {
    if (store.invoices.some((row) => row.Number === input.Number)) {
        fail(`There is already an invoice numbered ${input.Number}.`);
    }
    const invoice = {
        ID: store.nextId++,
        Number: input.Number,
        CustomerID: input.CustomerID,
        TotalAmount: input.TotalAmount,
        Paid: false,
        PaidDate: null,
        PaymentType: "N/A",
        Printed: false,
        Consolidated: false,
        ConsolidatedID: null,
    };
    store.invoices.push(invoice);
    const selectedIds = input.selected.map((id) => Number(id));
    for (const weekly of store.weeklies) {
        if (selectedIds.includes(weekly.ID)) {
            weekly.InvoiceID = invoice.ID;
        }
    }
    const jobIds = store.jobs.filter((job) => selectedIds.includes(job.WeeklyID)).map((job) => job.ID);
    if (jobIds.length === 0) {
        fail("Missing jobs for selected weeklies.");
    }
    for (const load of store.loads) {
        if (jobIds.includes(load.JobID)) {
            load.Invoiced = true;
            load.InvoiceID = invoice.ID;
        }
    }
    return invoice;
}

function invoicesDelete(store, id) {
    const invoice = store.invoices.find((row) => row.ID === id);
    if (!invoice) {
        notFound("Invoice not found.");
    }
    if (invoice.Consolidated) {
        for (const child of store.invoices) {
            if (child.ConsolidatedID === id) {
                child.ConsolidatedID = null;
            }
        }
    }
    invoice.ConsolidatedID = null;
    for (const load of store.loads) {
        if (load.InvoiceID === id) {
            load.Invoiced = false;
            load.InvoiceID = null;
        }
    }
    for (const weekly of store.weeklies) {
        if (weekly.InvoiceID === id) {
            weekly.InvoiceID = null;
        }
    }
    store.invoices = store.invoices.filter((row) => row.ID !== id);
}

function invoicesPostUnpaid(store, id) {
    const invoice = store.invoices.find((row) => row.ID === id);
    if (!invoice) {
        notFound("Invoice not found.");
    }
    if (invoice.Consolidated) {
        for (const child of store.invoices) {
            if (child.ConsolidatedID === id) {
                child.Paid = false;
                child.PaidDate = null;
                child.PaymentType = "N/A";
            }
        }
    }
    invoice.Paid = false;
    invoice.PaidDate = null;
    invoice.PaymentType = "N/A";
}

function weekliesPostReopen(store, id) {
    const weekly = store.weeklies.find((row) => row.ID === id);
    if (!weekly) {
        notFound("Weekly not found.");
    }
    if (weekly.InvoiceID != null) {
        fail("Delete the invoice first to reopen this weekly.");
    }
    weekly.Revenue = null;
    weekly.TotalWeight = null;
}

function weekliesPostClosed(store, id, revenue, totalWeight) {
    const weekly = store.weeklies.find((row) => row.ID === id);
    if (!weekly) {
        notFound("Weekly not found.");
    }
    weekly.Revenue = revenue;
    weekly.TotalWeight = totalWeight;
}

function jobsPostClosed(store, id, truckingRevenue, companyRevenue) {
    const job = store.jobs.find((row) => row.ID === id);
    if (!job) {
        fail("Job not found.");
    }
    if (job.TruckingRevenue !== null || job.CompanyRevenue !== null) {
        fail("Job is already closed.");
    }
    job.TruckingRevenue = truckingRevenue;
    job.CompanyRevenue = companyRevenue;
}

function jobsPostReopen(store, id) {
    const job = store.jobs.find((row) => row.ID === id);
    if (!job) {
        notFound("Job not found.");
    }
    if (job.PaidOut) {
        fail("Unpay this job or delete its paystub first.");
    }
    job.TruckingRevenue = null;
    job.CompanyRevenue = null;
}

function jobsPostPaid(store, id) {
    const job = store.jobs.find((row) => row.ID === id);
    if (!job) {
        notFound("Job not found.");
    }
    job.PaidOut = true;
}

function jobsPostUnpaid(store, id) {
    const job = store.jobs.find((row) => row.ID === id);
    if (!job) {
        notFound("Job not found.");
    }
    if (job.PayStubID != null) {
        fail("Delete the paystub first to mark this job unpaid.");
    }
    job.PaidOut = false;
}

function paystubsDelete(store, id) {
    const paystub = store.payStubs.find((row) => row.ID === id);
    if (!paystub) {
        notFound("Paystub not found.");
    }
    for (const job of store.jobs) {
        if (job.PayStubID === id) {
            job.PaidOut = false;
            job.PayStubID = null;
        }
    }
    store.payStubs = store.payStubs.filter((row) => row.ID !== id);
}

function loadsDelete(store, id) {
    const load = store.loads.find((row) => row.ID === id);
    if (!load) {
        notFound("Load not found.");
    }
    const job = store.jobs.find((row) => row.ID === load.JobID);
    if (job?.PaidOut) {
        fail("This job has already been paid out.");
    }
    if (load.Invoiced === true || load.InvoiceID != null) {
        fail("This load has been invoiced and cannot be edited.");
    }
    store.loads = store.loads.filter((row) => row.ID !== id);
}

function rematchOpenWeekly(store, load) {
    return store.weeklies.find(
        (weekly) =>
            weekly.CustomerID === load.CustomerID &&
            weekly.Week === load.Week &&
            weekly.DeliveryLocationID === load.DeliveryLocationID &&
            weekly.LoadTypeID === load.LoadTypeID &&
            weekly.InvoiceID == null &&
            weekly.Revenue == null,
    );
}

function massEditAllowed(store, loadId) {
    const load = store.loads.find((row) => row.ID === loadId);
    const job = store.jobs.find((row) => row.ID === load?.JobID);
    if (load?.Invoiced === true || load?.InvoiceID != null) {
        return false;
    }
    if (job?.PaidOut) {
        return false;
    }
    return true;
}

function throws(fn, pattern) {
    try {
        fn();
    } catch (error) {
        assert.match(String(error.message), pattern);
        return;
    }
    assert.fail(`expected error matching ${pattern}`);
}

export function runAllWorkflows() {
    // 1. Customer path: closed weekly → invoice → delete → still closed → reinvoice.
    {
        const store = createStore();
        const {weekly, job, load} = seedGraph(store);
        assert.equal(weekliesGetByCustomer(store, 1).some((row) => row.ID === weekly.ID), true);

        const invoice = invoicesPut(store, {
            Number: 999873,
            CustomerID: 1,
            TotalAmount: 340,
            selected: [String(weekly.ID)],
        });
        assert.equal(weekly.InvoiceID, invoice.ID);
        assert.equal(load.Invoiced, true);
        assert.equal(load.InvoiceID, invoice.ID);
        assert.equal(weekliesGetByCustomer(store, 1).some((row) => row.ID === weekly.ID), false);
        assert.equal(massEditAllowed(store, load.ID), false);

        throws(() => weekliesPostReopen(store, weekly.ID), /delete the invoice first/i);
        throws(() => loadsDelete(store, load.ID), /invoiced/i);
        jobsPostClosed(store, job.ID, 180, 340);
        assert.equal(job.TruckingRevenue, 180);
        assert.equal(weekly.InvoiceID, invoice.ID);

        invoicesDelete(store, invoice.ID);
        assert.equal(store.invoices.find((row) => row.ID === invoice.ID), undefined);
        assert.equal(weekly.InvoiceID, null);
        assert.equal(weekly.Revenue, 340);
        assert.equal(load.InvoiceID, null);
        assert.equal(load.Invoiced, false);
        assert.equal(job.PaidOut, false);
        assert.equal(weekliesGetByCustomer(store, 1).some((row) => row.ID === weekly.ID), true);
        assert.equal(massEditAllowed(store, load.ID), true);

        const reinvoice = invoicesPut(store, {
            Number: 999874,
            CustomerID: 1,
            TotalAmount: 340,
            selected: [String(weekly.ID)],
        });
        assert.equal(weekly.InvoiceID, reinvoice.ID);
        assert.equal(load.Invoiced, true);
    }

    // 1b. Weekly can close first; leftover jobs can still close and be paid out.
    {
        const store = createStore();
        const {weekly, job, load} = seedGraph(store);
        assert.equal(weekly.Revenue, 340);
        assert.equal(job.TruckingRevenue, null);
        jobsPostClosed(store, job.ID, 180, 340);
        assert.equal(job.TruckingRevenue, 180);
        jobsPostPaid(store, job.ID);
        assert.equal(job.PaidOut, true);
        assert.equal(weekly.Revenue, 340);
        throws(() => jobsPostClosed(store, job.ID, 1, 1), /already closed/i);
        throws(() => loadsDelete(store, load.ID), /paid out/i);
    }

    // 2. After delete, reopen weekly so jobs can close and rematch can reuse it.
    {
        const store = createStore();
        const {weekly, job, load} = seedGraph(store);
        const invoice = invoicesPut(store, {
            Number: 1001,
            CustomerID: 1,
            TotalAmount: 340,
            selected: [String(weekly.ID)],
        });
        invoicesDelete(store, invoice.ID);
        weekliesPostReopen(store, weekly.ID);
        assert.equal(weekly.Revenue, null);
        assert.equal(weekly.TotalWeight, null);
        assert.equal(weekliesGetByCustomer(store, 1).some((row) => row.ID === weekly.ID), false);
        assert.equal(rematchOpenWeekly(store, load)?.ID, weekly.ID);

        jobsPostClosed(store, job.ID, 180, 340);
        assert.equal(job.TruckingRevenue, 180);
        jobsPostReopen(store, job.ID);
        assert.equal(job.TruckingRevenue, null);
        assert.equal(job.CompanyRevenue, null);
        assert.equal(job.PaidOut, false);
    }

    // 3. Closed weekly does not block mass edit; rematch leaves it for a new weekly on type change.
    {
        const store = createStore();
        const {weekly, load} = seedGraph(store);
        assert.equal(massEditAllowed(store, load.ID), true);
        assert.equal(rematchOpenWeekly(store, load), undefined);

        load.LoadTypeID = 99;
        assert.equal(rematchOpenWeekly(store, load), undefined);

        weekliesPostReopen(store, weekly.ID);
        load.LoadTypeID = 2;
        assert.equal(rematchOpenWeekly(store, load)?.ID, weekly.ID);
    }

    // 4. Invoice unpay keeps links; consolidated children unpay with parent.
    {
        const store = createStore();
        const {weekly, load} = seedGraph(store);
        const parent = invoicesPut(store, {
            Number: 2001,
            CustomerID: 1,
            TotalAmount: 340,
            selected: [String(weekly.ID)],
        });
        parent.Paid = true;
        parent.PaidDate = new Date("2099-02-10");
        parent.PaymentType = "Check";
        parent.Consolidated = true;
        const child = {
            ID: store.nextId++,
            Number: 2002,
            CustomerID: 1,
            TotalAmount: 40,
            Paid: true,
            PaidDate: new Date("2099-02-10"),
            PaymentType: "Check",
            Printed: false,
            Consolidated: false,
            ConsolidatedID: parent.ID,
        };
        store.invoices.push(child);

        invoicesPostUnpaid(store, parent.ID);
        assert.equal(parent.Paid, false);
        assert.equal(parent.PaidDate, null);
        assert.equal(child.Paid, false);
        assert.equal(weekly.InvoiceID, parent.ID);
        assert.equal(load.InvoiceID, parent.ID);

        invoicesDelete(store, parent.ID);
        assert.equal(child.ConsolidatedID, null);
        assert.equal(store.invoices.some((row) => row.ID === child.ID), true);
        assert.equal(weekly.InvoiceID, null);
    }

    // 5. Job paid-out / paystub / load-delete gates.
    {
        const store = createStore();
        const {weekly, job, load} = seedGraph(store, {weekly: {Revenue: null}});
        jobsPostClosed(store, job.ID, 180, 340);
        jobsPostPaid(store, job.ID);
        assert.equal(massEditAllowed(store, load.ID), false);
        throws(() => jobsPostReopen(store, job.ID), /unpay this job or delete its paystub/i);
        throws(() => loadsDelete(store, load.ID), /paid out/i);

        jobsPostUnpaid(store, job.ID);
        assert.equal(job.PaidOut, false);
        assert.equal(job.TruckingRevenue, 180);
        assert.equal(massEditAllowed(store, load.ID), true);

        const paystub = {ID: store.nextId++, DriverID: job.DriverID};
        store.payStubs.push(paystub);
        job.PaidOut = true;
        job.PayStubID = paystub.ID;
        throws(() => jobsPostUnpaid(store, job.ID), /delete the paystub first/i);
        throws(() => jobsPostReopen(store, job.ID), /unpay this job or delete its paystub/i);

        paystubsDelete(store, paystub.ID);
        assert.equal(store.payStubs.length, 0);
        assert.equal(job.PaidOut, false);
        assert.equal(job.PayStubID, null);
        assert.equal(job.TruckingRevenue, 180);

        loadsDelete(store, load.ID);
        assert.equal(store.loads.find((row) => row.ID === load.ID), undefined);
        assert.equal(weekliesGetByCustomer(store, 1).some((row) => row.ID === weekly.ID), false);
    }

    return "ok";
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
    runAllWorkflows();
    console.log("All undo workflow mock walks passed.");
}
