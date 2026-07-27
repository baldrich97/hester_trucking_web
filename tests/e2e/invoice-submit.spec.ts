import {expect, test} from "@playwright/test";
import {TestRunTracker} from "../helpers/testRunTracker";
import {createSeedPrisma, seedWeeklyForInvoice, type InvoiceWeeklySeed} from "./helpers/dbSeed";

/**
 * Full invoice-create flow: seeds an isolated [TEST] customer + closed weekly,
 * drives the invoice form through the browser, then verifies the DB linkage
 * (weekly.InvoiceID, load.Invoiced) and cleans everything up.
 */

/** Reserved test invoice number (999800+ range, above the vitest DB tests). */
const INVOICE_NUMBER = 999871;

const prisma = createSeedPrisma();
const tracker = new TestRunTracker();
let seed: InvoiceWeeklySeed;

test.describe.configure({mode: "serial"});

test.beforeAll(async () => {
    // Remove leftovers from a crashed prior run so findFirst below is unambiguous.
    const stale = await prisma.invoices.findMany({where: {Number: INVOICE_NUMBER}});
    for (const invoice of stale) {
        await prisma.weeklies.updateMany({
            where: {InvoiceID: invoice.ID},
            data: {InvoiceID: null},
        });
        await prisma.loads.updateMany({
            where: {InvoiceID: invoice.ID},
            data: {InvoiceID: null, Invoiced: false},
        });
        await prisma.invoices.delete({where: {ID: invoice.ID}}).catch(() => undefined);
    }

    seed = await seedWeeklyForInvoice(prisma, tracker, String(Date.now() % 1000000));
});

test.afterAll(async () => {
    const invoice = await prisma.invoices.findFirst({where: {Number: INVOICE_NUMBER}});
    if (invoice) tracker.track("invoices", invoice.ID);
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

test("creates an invoice from a seeded weekly through the UI", async ({page}) => {
    await page.goto("/invoices");
    await expect(page.locator("main")).toBeVisible({timeout: 15000});

    // Pick the seeded customer; its weeklies load into the selection table.
    const customerInput = page.locator("#Customer-autocomplete");
    await customerInput.click();
    await customerInput.fill(seed.customerQuery);
    await page.getByRole("option").first().click({timeout: 10000});

    const weekliesTable = page
        .locator("table")
        .filter({has: page.getByLabel("select all weeklies")});
    const rowCheckbox = weekliesTable.locator("tbody input[type='checkbox']").first();
    await expect(rowCheckbox).toBeVisible({timeout: 15000});
    await rowCheckbox.click();

    await page.getByLabel("Number", {exact: true}).fill(String(INVOICE_NUMBER));

    const submit = page.getByRole("button", {name: "Submit", exact: true});
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText("Successfully Submitted!")).toBeVisible({timeout: 30000});

    // Invoiced weekly should drop out of the selection table after refetch.
    await expect(weekliesTable.locator("tbody input[type='checkbox']")).toHaveCount(0, {
        timeout: 15000,
    });

    // DB linkage created by the UI submit.
    const invoice = await prisma.invoices.findFirst({
        where: {Number: INVOICE_NUMBER, CustomerID: seed.customerId},
        orderBy: {ID: "desc"},
    });
    expect(invoice).toBeTruthy();
    tracker.track("invoices", invoice!.ID);
    expect(Number(invoice!.TotalAmount)).toBeCloseTo(340, 1);

    const weekly = await prisma.weeklies.findUnique({where: {ID: seed.weeklyId}});
    expect(weekly?.InvoiceID).toBe(invoice!.ID);

    const load = await prisma.loads.findUnique({where: {ID: seed.loadId}});
    expect(load?.Invoiced).toBe(true);
    expect(load?.InvoiceID).toBe(invoice!.ID);
});
