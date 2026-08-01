import {expect, test, type Page} from "@playwright/test";
import {TestRunTracker} from "../helpers/testRunTracker";
import {createSeedPrisma, seedComplianceDriver, type ComplianceSeed} from "./helpers/dbSeed";

/**
 * Driver compliance UI/UX flows with a seeded [TEST] W2 driver:
 * - w2_forms: file a form via the checkbox -> date modal, then remove it via the
 *   destructive confirm dialog.
 * - expiring-soon: the seeded driver's CDL (expires in 10 days) is listed.
 * - form-options: the seeded form row is present and editable.
 */

const prisma = createSeedPrisma();
const tracker = new TestRunTracker();
let seed: ComplianceSeed;

test.describe.configure({mode: "serial"});

test.beforeAll(async () => {
    seed = await seedComplianceDriver(prisma, tracker, String(Date.now() % 1000000));
    // Safety net: the remove-filing test deletes this via the UI, but a failed
    // run should not leave the driverForms row behind.
    tracker.trackDriverForm(seed.driverId, seed.formId);
});

test.afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

/** Column index of the seeded form on w2_forms (columns follow SSR form ordering). */
async function seededFormColumnIndex(): Promise<number> {
    const forms = await prisma.formOptions.findMany({
        where: {W2Visible: true},
        orderBy: [{Forms: {DisplayName: "asc"}}, {Form: "asc"}],
    });
    return forms.findIndex((f) => f.Form === seed.formId);
}

/** The seeded driver's row container on w2_forms (innermost grid holding the link). */
function driverRow(page: Page) {
    return page
        .locator(".MuiGrid2-container")
        .filter({has: page.getByRole("link", {name: seed.driverName})})
        .last();
}

test("w2_forms files a form for the seeded driver via the date modal", async ({page}) => {
    const columnIndex = await seededFormColumnIndex();
    expect(columnIndex).toBeGreaterThanOrEqual(0);

    await page.goto("/drivers/w2_forms");
    const row = driverRow(page);
    await expect(row).toBeVisible({timeout: 15000});

    const checkbox = row.locator("input[type='checkbox']").nth(columnIndex);
    await expect(checkbox).not.toBeChecked();
    await checkbox.click();

    // Modal: explicit expiration cadence — type a date and check the live preview.
    const dateInput = page.getByLabel("Expiration date");
    await expect(dateInput).toBeVisible({timeout: 10000});
    await dateInput.click();
    await dateInput.pressSequentially("12/31/2099");
    await expect(page.getByText(/Expires on 12\/31\/2099/)).toBeVisible({timeout: 5000});

    await page.getByRole("button", {name: "Save"}).click();
    await expect(page.getByText(/Successfully submitted/i)).toBeVisible({timeout: 30000});

    // SSR refresh should re-render the checkbox as satisfied.
    await expect(
        driverRow(page).locator("input[type='checkbox']").nth(columnIndex),
    ).toBeChecked({timeout: 30000});

    const filed = await prisma.driverForms.findFirst({
        where: {Driver: seed.driverId, Form: seed.formId},
    });
    expect(filed).toBeTruthy();
});

test("w2_forms removes the filing through the confirm dialog", async ({page}) => {
    const columnIndex = await seededFormColumnIndex();

    await page.goto("/drivers/w2_forms");
    const checkbox = driverRow(page).locator("input[type='checkbox']").nth(columnIndex);
    await expect(checkbox).toBeChecked({timeout: 15000});
    await checkbox.click();

    await expect(page.getByText("Remove filing")).toBeVisible({timeout: 10000});
    await page.getByRole("button", {name: "Yes", exact: true}).click();

    await expect(
        driverRow(page).locator("input[type='checkbox']").nth(columnIndex),
    ).not.toBeChecked({timeout: 30000});

    const remaining = await prisma.driverForms.findFirst({
        where: {Driver: seed.driverId, Form: seed.formId},
    });
    expect(remaining).toBeNull();
});

test("expiring-soon lists the seeded driver's CDL", async ({page}) => {
    await page.goto("/drivers/expiring-soon");
    await expect(page.getByText("Forms expiring soon")).toBeVisible({timeout: 15000});

    const block = page.locator(".MuiPaper-root").filter({hasText: seed.driverName}).first();
    await expect(block).toBeVisible({timeout: 20000});
    await expect(block.getByText("Driver license (CDL)")).toBeVisible();
    await expect(
        block.getByText(seed.licenseExpiration.toLocaleDateString()).first(),
    ).toBeVisible();
});

test("form-options shows the seeded form and saves a change", async ({page}) => {
    await page.goto("/drivers/form-options");
    const row = page.getByRole("row").filter({hasText: seed.formName});
    await expect(row).toBeVisible({timeout: 20000});

    // Toggle "OO vis" (2nd checkbox) and save; DB should reflect it.
    await row.locator("input[type='checkbox']").nth(1).click();
    await row.getByRole("button", {name: "Save"}).click();
    await expect(page.getByText("Saved")).toBeVisible({timeout: 15000});

    const option = await prisma.formOptions.findFirst({where: {Form: seed.formId}});
    expect(option?.OOVisible).toBe(true);
});

test("driver profile Forms tab files a form via card UI", async ({page}) => {
    await page.goto(`/drivers/${seed.driverId}?tab=forms`);
    const formsTab = page.getByRole("tab", {name: /Forms/i});
    await expect(formsTab).toBeVisible({timeout: 15000});
    await formsTab.click();
    await expect(page.getByRole("heading", {name: "Required forms"})).toBeVisible({timeout: 15000});

    const medCardRow = page.locator(".MuiPaper-root").filter({hasText: seed.formName}).first();
    await expect(medCardRow).toBeVisible({timeout: 15000});

    const markButton = medCardRow.getByRole("button", {name: /Mark on file|Update date/i});
    await markButton.click();

    const dateInput = page.getByLabel("Expiration date");
    await expect(dateInput).toBeVisible({timeout: 10000});
    await dateInput.click();
    await dateInput.pressSequentially("12/31/2099");
    await page.getByRole("button", {name: "Save"}).click();
    await expect(page.getByText(/Successfully submitted/i)).toBeVisible({timeout: 30000});

    await expect(medCardRow.getByText("On file")).toBeVisible({timeout: 15000});

    const filed = await prisma.driverForms.findFirst({
        where: {Driver: seed.driverId, Form: seed.formId},
    });
    expect(filed).toBeTruthy();
});
