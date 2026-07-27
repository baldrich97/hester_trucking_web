import {expect, test} from "@playwright/test";
import {TestRunTracker} from "../helpers/testRunTracker";
import {nextTestTicket} from "../helpers/testData";
import {
    createSeedPrisma,
    seedNewEraCatalog,
    seedOpenLegacyJob,
    type NewEraCatalogSeed,
    type OpenLegacyJobSeed,
} from "./helpers/dbSeed";
import {selectAutocompleteOption} from "./helpers/forms";

/**
 * Cutover load-entry UX, end to end against seeded data:
 * - progressive open-jobs filtering (customer only, week not applied)
 * - legacy path: row click -> prefill -> full submit -> ticket attaches to the seeded job
 * - new-era path: seeded Source + clean load type (ID >= 10000) -> full submit
 * - inline Source creation from the form
 */

const prisma = createSeedPrisma();
const tracker = new TestRunTracker();
let legacySeed: OpenLegacyJobSeed;
let newEraSeed: NewEraCatalogSeed;

/** StartDate is schema-required; MM/dd/yyyy for the MUI Delivered On picker. */
function todayForDatePicker(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${now.getFullYear()}`;
}

test.describe.configure({mode: "serial"});

test.beforeAll(async () => {
    const token = String(Date.now() % 100000);
    legacySeed = await seedOpenLegacyJob(prisma, tracker, token);
    newEraSeed = await seedNewEraCatalog(prisma, tracker, token);
});

test.afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

test("progressive filter: customer alone shows open jobs before week applies", async ({page}) => {
    await page.goto("/loads");
    const form = page.getByTestId("load-form");
    await expect(form).toBeVisible({timeout: 15000});

    // Customer only — no driver, week untouched (default should NOT filter).
    await selectAutocompleteOption(page, "Customer", legacySeed.customerQuery, {root: form});

    await expect(page.getByText(/open legacy job/i)).toBeVisible({timeout: 15000});
    await expect(page.getByText(/daily week not applied yet/i)).toBeVisible();
    await expect(page.getByText(legacySeed.loadTypeDescription)).toBeVisible();
});

test("legacy path: row click prefills, marks active, and submit attaches to the seeded job", async ({page}) => {
    await page.goto("/loads");
    const form = page.getByTestId("load-form");
    await expect(form).toBeVisible({timeout: 15000});

    await selectAutocompleteOption(page, "Driver", legacySeed.driverQuery, {root: form});
    await selectAutocompleteOption(page, "Customer", legacySeed.customerQuery, {root: form});

    const row = page.getByRole("row").filter({hasText: legacySeed.loadTypeDescription}).first();
    await expect(row).toBeVisible({timeout: 15000});
    await row.click();

    // Active-row flag and legacy mode (Source hidden).
    await expect(page.getByText("Active", {exact: true})).toBeVisible();
    await expect(page.getByLabel(/^Source/i)).toHaveCount(0);
    await expect(form.getByLabel("Load Type", {exact: true})).not.toHaveValue("");

    const ticket = String(nextTestTicket(92));
    await form.getByLabel(/Ticket Number/i).fill(ticket);
    await form.getByLabel(/^Weight$/i).fill("20");
    await form.getByLabel("Delivered On").fill(todayForDatePicker());
    await page.getByTestId("form-submit").click();
    await expect(page.getByText(/Successfully Submitted/i)).toBeVisible({timeout: 30000});

    const load = await prisma.loads.findFirst({where: {TicketNumber: Number(ticket)}});
    expect(load).toBeTruthy();
    tracker.track("loads", load!.ID);
    expect(load!.JobID).toBe(legacySeed.jobId);
    expect(load!.SourceID).toBeNull();
});

test("new work path: seeded clean load type + inline-created source submit", async ({page}) => {
    await page.goto("/loads");
    const form = page.getByTestId("load-form");
    await expect(form).toBeVisible({timeout: 15000});

    await selectAutocompleteOption(page, "Driver", legacySeed.driverQuery, {root: form});
    await expect(page.getByText("New work instead")).toBeVisible({timeout: 15000});
    await page.getByText("New work instead").click();

    const sourceInput = page.locator("#Source-autocomplete");
    await expect(sourceInput).toBeVisible({timeout: 10000});

    // Inline-create a Source without leaving the form.
    await sourceInput.click();
    await sourceInput.press("ArrowDown");
    const newSource = page.getByRole("option", {name: "New Source"});
    await expect(newSource).toBeVisible({timeout: 10000});
    await newSource.click();

    const token = String(Date.now() % 100000);
    await page.getByLabel("Name", {exact: true}).fill(`[TEST] E2E Source ${token}`);
    await page.getByLabel("Short Name (for invoices/PDFs)").fill(`T-${token}`);
    await page.getByRole("button", {name: "Create"}).click();
    await expect(page.getByText(/Successfully Submitted/i)).toBeVisible({timeout: 15000});

    await selectAutocompleteOption(page, "Customer", legacySeed.customerQuery, {root: form});

    // Seeded clean load type (ID >= 10000) — deterministic, not "first option".
    await selectAutocompleteOption(page, "Load Type", newEraSeed.loadTypeQuery, {root: form});

    // Server requires a delivery location; the legacy path gets this from the row prefill.
    await selectAutocompleteOption(
        page,
        "Delivery Location",
        legacySeed.deliveryLocationDescription,
        {root: form},
    );

    const ticket = String(nextTestTicket(93));
    await form.getByLabel(/Ticket Number/i).fill(ticket);
    await form.getByLabel(/^Weight$/i).fill("20");
    await form.getByLabel("Delivered On").fill(todayForDatePicker());
    await page.getByTestId("form-submit").click();
    await expect(page.getByText(/Successfully Submitted/i)).toBeVisible({timeout: 30000});

    const load = await prisma.loads.findFirst({where: {TicketNumber: Number(ticket)}});
    expect(load).toBeTruthy();
    tracker.track("loads", load!.ID);
    expect(load!.LoadTypeID).toBe(newEraSeed.loadTypeId);
    expect(load!.LoadTypeID).toBeGreaterThanOrEqual(10000);
    expect(load!.SourceID).toBeTruthy();
    expect(load!.JobID).not.toBe(legacySeed.jobId);
});

test("new work path: seeded source appears in Source dropdown", async ({page}) => {
    await page.goto("/loads");
    const form = page.getByTestId("load-form");
    await expect(form).toBeVisible({timeout: 15000});

    await selectAutocompleteOption(page, "Driver", legacySeed.driverQuery, {root: form});
    await expect(page.getByText("New work instead")).toBeVisible({timeout: 15000});
    await page.getByText("New work instead").click();

    await selectAutocompleteOption(page, "Source", newEraSeed.sourceQuery, {root: form});
    await expect(form.getByLabel(/^Source/i)).not.toHaveValue("");
});
