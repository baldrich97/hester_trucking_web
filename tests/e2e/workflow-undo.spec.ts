import {expect, test} from "@playwright/test";
import {TestRunTracker} from "../helpers/testRunTracker";
import {TEST_NAME_PREFIX} from "../helpers/testData";
import {createSeedPrisma, E2E_SEED_WEEK, seedWeeklyForInvoice} from "./helpers/dbSeed";

/**
 * Invoice delete/unpay, paystub delete, weekly reopen, and daily job undo through the UI.
 * Playwright is not run on the author's machine; this spec is for CI / other hosts.
 */

const INVOICE_NUMBER = 999873;

const prisma = createSeedPrisma();
const tracker = new TestRunTracker();

test.describe.configure({mode: "serial"});

test.afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

test("deletes an invoice from the detail page and unlinks the weekly", async ({page}) => {
    const seed = await seedWeeklyForInvoice(prisma, tracker, String(Date.now() % 1000000));
    const invoice = await prisma.invoices.create({
        data: {
            InvoiceDate: new Date("2099-02-03T12:00:00.000Z"),
            Number: INVOICE_NUMBER,
            CustomerID: seed.customerId,
            TotalAmount: 340,
            Paid: false,
            Printed: false,
        },
    });
    tracker.track("invoices", invoice.ID);
    await prisma.weeklies.update({
        where: {ID: seed.weeklyId},
        data: {InvoiceID: invoice.ID},
    });
    await prisma.loads.update({
        where: {ID: seed.loadId},
        data: {InvoiceID: invoice.ID, Invoiced: true},
    });

    await page.goto(`/invoices/${invoice.ID}`);
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
    await page.getByRole("button", {name: "Delete", exact: true}).click();
    const confirm = page.locator(".react-confirm-alert");
    await expect(confirm).toBeVisible({timeout: 10000});
    await expect(confirm).toContainText(/permanently deletes the invoice/i);
    await confirm.getByRole("button", {name: "Delete", exact: true}).click();
    await expect(page.getByText("Successfully Deleted!")).toBeVisible({timeout: 30000});

    expect(await prisma.invoices.findUnique({where: {ID: invoice.ID}})).toBeNull();
    const weekly = await prisma.weeklies.findUnique({where: {ID: seed.weeklyId}});
    expect(weekly?.InvoiceID).toBeNull();
    expect(weekly?.Revenue).not.toBeNull();
    const load = await prisma.loads.findUnique({where: {ID: seed.loadId}});
    expect(load?.InvoiceID).toBeNull();
    expect(load?.Invoiced).toBe(false);
});

test("reopens a closed uninvoiced weekly from the weekly sheet", async ({page}) => {
    const seed = await seedWeeklyForInvoice(prisma, tracker, String(Date.now() % 1000000));
    await page.goto(`/weeklies?defaultWeek=${E2E_SEED_WEEK}&forceExpand=1`);
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
    await expect(page.getByText(seed.customerQuery)).toBeVisible({timeout: 20000});
    const sheet = page.locator("div").filter({hasText: seed.customerQuery}).first();
    await sheet.getByRole("button", {name: "Reopen weekly"}).click();
    await expect(page.locator(".react-confirm-alert")).toContainText(/reopens the weekly/i);
    await page.getByRole("button", {name: "Reopen", exact: true}).click();
    await expect(page.getByText("Weekly reopened.")).toBeVisible({timeout: 20000});

    const weekly = await prisma.weeklies.findUnique({where: {ID: seed.weeklyId}});
    expect(weekly?.Revenue).toBeNull();
});

test("marks a paid invoice unpaid from the detail page", async ({page}) => {
    const seed = await seedWeeklyForInvoice(prisma, tracker, String(Date.now() % 1000000));
    const invoice = await prisma.invoices.create({
        data: {
            InvoiceDate: new Date("2099-02-03T12:00:00.000Z"),
            Number: INVOICE_NUMBER + 1,
            CustomerID: seed.customerId,
            TotalAmount: 340,
            Paid: true,
            PaidDate: new Date("2099-02-10T12:00:00.000Z"),
            PaymentType: "Check",
            Printed: false,
        },
    });
    tracker.track("invoices", invoice.ID);
    await prisma.weeklies.update({
        where: {ID: seed.weeklyId},
        data: {InvoiceID: invoice.ID},
    });
    await prisma.loads.update({
        where: {ID: seed.loadId},
        data: {InvoiceID: invoice.ID, Invoiced: true},
    });

    await page.goto(`/invoices/${invoice.ID}`);
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
    await page.getByRole("button", {name: "Unpay", exact: true}).click();
    const confirm = page.locator(".react-confirm-alert");
    await expect(confirm).toBeVisible({timeout: 10000});
    await expect(confirm).toContainText(/marks the invoice unpaid/i);
    await confirm.getByRole("button", {name: "Unpay", exact: true}).click();
    await expect(page.getByText("Invoice marked unpaid.")).toBeVisible({timeout: 20000});

    const updated = await prisma.invoices.findUnique({where: {ID: invoice.ID}});
    expect(updated?.Paid).toBe(false);
    expect(updated?.PaidDate).toBeNull();
    const weekly = await prisma.weeklies.findUnique({where: {ID: seed.weeklyId}});
    expect(weekly?.InvoiceID).toBe(invoice.ID);
});

test("deletes a paystub from the detail page and unpays its jobs", async ({page}) => {
    const seed = await seedWeeklyForInvoice(prisma, tracker, String(Date.now() % 1000000));
    const paystub = await prisma.payStubs.create({
        data: {
            Created: new Date(),
            DriverID: (await prisma.jobs.findUnique({where: {ID: seed.jobId}}))!.DriverID,
            CheckNumber: `${TEST_NAME_PREFIX}-Undo-${Date.now() % 100000}`,
            Gross: 100,
            Percentage: 25,
            NetTotal: 75,
            TakeHome: 75,
            Deductions: 0,
            Additions: 0,
        },
    });
    tracker.track("payStubs", paystub.ID);
    await prisma.jobs.update({
        where: {ID: seed.jobId},
        data: {PaidOut: true, PayStubID: paystub.ID},
    });

    await page.goto(`/paystubs/${paystub.ID}`);
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
    await page.getByRole("button", {name: "Delete", exact: true}).click();
    const confirm = page.locator(".react-confirm-alert");
    await expect(confirm).toBeVisible({timeout: 10000});
    await expect(confirm).toContainText(/permanently deletes the paystub/i);
    await confirm.getByRole("button", {name: "Delete", exact: true}).click();
    await expect(page.getByText("Successfully Deleted!")).toBeVisible({timeout: 30000});

    expect(await prisma.payStubs.findUnique({where: {ID: paystub.ID}})).toBeNull();
    const job = await prisma.jobs.findUnique({where: {ID: seed.jobId}});
    expect(job?.PaidOut).toBe(false);
    expect(job?.PayStubID).toBeNull();
});

test("reopens a closed unpaid job from the daily sheet", async ({page}) => {
    const seed = await seedWeeklyForInvoice(prisma, tracker, String(Date.now() % 1000000));
    await prisma.weeklies.update({
        where: {ID: seed.weeklyId},
        data: {Revenue: null, TotalWeight: null},
    });
    await prisma.jobs.update({
        where: {ID: seed.jobId},
        data: {TruckingRevenue: 180, CompanyRevenue: 340, PaidOut: false},
    });
    const load = await prisma.loads.findUnique({where: {ID: seed.loadId}});

    await page.goto(`/dailies?defaultWeek=${E2E_SEED_WEEK}&forceExpand=1`);
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
    await expect(page.getByText(String(load?.TicketNumber))).toBeVisible({timeout: 20000});
    const sheet = page.locator("div").filter({hasText: String(load?.TicketNumber)}).first();
    await sheet.getByRole("button", {name: "Reopen job"}).click();
    await expect(page.locator(".react-confirm-alert")).toContainText(/reopens the job/i);
    await page.getByRole("button", {name: "Reopen", exact: true}).click();
    await expect(page.getByText("Job reopened.")).toBeVisible({timeout: 20000});

    const job = await prisma.jobs.findUnique({where: {ID: seed.jobId}});
    expect(job?.TruckingRevenue).toBeNull();
    expect(job?.CompanyRevenue).toBeNull();
    expect(job?.PaidOut).toBe(false);
});

test("unmarks a daily-sheet paid-out job that is not on a paystub", async ({page}) => {
    const seed = await seedWeeklyForInvoice(prisma, tracker, String(Date.now() % 1000000));
    await prisma.jobs.update({
        where: {ID: seed.jobId},
        data: {TruckingRevenue: 180, CompanyRevenue: 340, PaidOut: true, PayStubID: null},
    });
    const load = await prisma.loads.findUnique({where: {ID: seed.loadId}});

    await page.goto(`/dailies?defaultWeek=${E2E_SEED_WEEK}&forceExpand=1`);
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
    await expect(page.getByText(String(load?.TicketNumber))).toBeVisible({timeout: 20000});
    const sheet = page.locator("div").filter({hasText: String(load?.TicketNumber)}).first();
    await sheet.getByRole("button", {name: "Unmark job paid out"}).click();
    await expect(page.locator(".react-confirm-alert")).toContainText(/marks the job unpaid/i);
    await page.getByRole("button", {name: "Unpay", exact: true}).click();
    await expect(page.getByText("Job marked unpaid.")).toBeVisible({timeout: 20000});

    const job = await prisma.jobs.findUnique({where: {ID: seed.jobId}});
    expect(job?.PaidOut).toBe(false);
    expect(job?.TruckingRevenue).toBe(180);
});
