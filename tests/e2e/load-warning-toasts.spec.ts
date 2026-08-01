import {expect, test} from "@playwright/test";
import {nextTestTicket} from "../helpers/testData";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    createSeedPrisma,
    seedClosedJobWarningContext,
    seedDailyPrintedWarningContext,
    seedPaystubGrossMismatch,
    type ClosedJobWarningSeed,
    type DailyPrintedWarningSeed,
} from "./helpers/dbSeed";
import {selectAutocompleteOption} from "./helpers/forms";

const prisma = createSeedPrisma();
const tracker = new TestRunTracker();

test.describe.configure({mode: "serial"});

test.afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

function todayForDatePicker(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${now.getFullYear()}`;
}

async function submitLegacyOpenJobLoad(
    page: import("@playwright/test").Page,
    seed: DailyPrintedWarningSeed | ClosedJobWarningSeed,
    ticket: string,
) {
    await page.goto("/loads");
    const form = page.getByTestId("load-form");
    await expect(form).toBeVisible({timeout: 15000});

    await selectAutocompleteOption(page, "Driver", seed.driverQuery, {root: form});
    await selectAutocompleteOption(page, "Customer", seed.customerQuery, {root: form});

    const row = page.getByRole("row").filter({hasText: seed.loadTypeDescription}).first();
    await expect(row).toBeVisible({timeout: 15000});
    await row.click();

    await form.getByLabel(/Ticket Number/i).fill(ticket);
    await form.getByLabel(/^Weight$/i).fill("20");
    await form.getByLabel("Delivered On").fill(todayForDatePicker());

    await page.getByTestId("form-submit").click();
}

test("LW-E1: load create shows daily printed warning toast", async ({page}) => {
    const seed = await seedDailyPrintedWarningContext(prisma, tracker, String(Date.now() % 100000));
    await submitLegacyOpenJobLoad(page, seed, String(nextTestTicket(901)));

    await expect(page.locator(".Toastify__toast").filter({hasText: /already been printed/i})).toBeVisible({
        timeout: 30000,
    });
    await expect(page.getByText(/Successfully Submitted/i)).not.toBeVisible();
});

test("LW-E2: load edit shows closed-job rematch warning toast", async ({page}) => {
    const seed = await seedClosedJobWarningContext(prisma, tracker, String(Date.now() % 100000));
    await page.goto(`/loads/${seed.rematchLoadId}`);
    const form = page.getByTestId("load-form");
    await expect(form).toBeVisible({timeout: 15000});

    await form.getByLabel("Truck Rate", {exact: true}).fill("11");
    await form.getByLabel("Material Rate", {exact: true}).fill("6");
    await form.getByLabel("Driver Rate", {exact: true}).fill("9");
    await form.getByLabel("Company Rate", {exact: true}).fill("17");

    await page.getByTestId("form-submit").click();

    await expect(page.locator(".Toastify__toast").filter({hasText: /closed or paid out job/i})).toBeVisible({
        timeout: 30000,
    });
    await expect(page.getByText(/Successfully Submitted/i)).not.toBeVisible();
});

// Paid-out mass edit error toast: covered by PO-E1 in mass-edit-job-scope.spec.ts

test("LW-E4: paystub print shows gross mismatch warning toast", async ({page}) => {
    const seed = await seedPaystubGrossMismatch(prisma, tracker, String(Date.now() % 100000));
    await page.goto(`/paystubs/${seed.paystubId}`);
    await expect(page.getByRole("button", {name: /print/i})).toBeVisible({timeout: 15000});

    await page.getByRole("button", {name: /print/i}).click();
    await expect(page.locator(".Toastify__toast").filter({hasText: /differs from recalculated job totals/i})).toBeVisible({
        timeout: 15000,
    });
});
