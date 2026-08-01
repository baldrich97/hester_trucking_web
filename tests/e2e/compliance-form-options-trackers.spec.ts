import path from "path";

import {expect, test, type Page} from "@playwright/test";

import type {FormExpiryCadence} from "@prisma/client";

import {TestRunTracker} from "../helpers/testRunTracker";

import {createSeedPrisma} from "./helpers/dbSeed";

import {

    CADENCE_FORM_LABELS,

    type ComplianceTrackerSeed,

    cadenceQualifiesForExpSoonFromDb,

    deleteAllTestForms,

    expectedExpSoonEndDateLabelFromDb,

    expSoonCadenceCellLabel,

    fileAllCadenceDemonstrations,

    fileDriverFormExpiring,

    ooEntityRow,

    ooEntityBlock,

    countDistinctTrucksForOoDriver,

    ooFormColumnIndex,

    seedComplianceTrackerDrivers,

    seedComplianceTrackerForms,

    seedSecondOoTruck,

    TRACKER_EXPIRING_FORM_LABEL,

    TRACKER_FLEET_WIDE_FORM_LABEL,

    TRACKER_OO_FORM_LABEL,

    TRACKER_PDF_COLUMN_LABEL,

    TRACKER_PDF_FORM_LABEL,

    TRACKER_W2_FORM_LABEL,

    w2FormColumnIndex,

} from "./helpers/complianceFixtures";



/**

 * Compliance tracker E2E suite.

 *

 * beforeAll: delete all [TEST] forms, recreate every tracker/cadence form via Form Options,

 * seed drivers, file cadence demonstrations. Data is left in the DB for manual inspection.

 */



const prisma = createSeedPrisma();

const tracker = new TestRunTracker();

const authFile = path.join(__dirname, ".auth", "user.json");

let seed: ComplianceTrackerSeed;



const CADENCES = Object.keys(CADENCE_FORM_LABELS) as FormExpiryCadence[];

const CADENCE_EXPIRY_LABELS: Record<FormExpiryCadence, string> = {
    NONE: "No expiry",
    EXPIRATION_DATE: "By explicit expiration date",
    CALENDAR_YEAR: "Calendar year (resets Jan 1)",
    CALENDAR_MONTH: "Calendar month (resets monthly)",
    ROLLING_MONTHS: "Rolling months from submitted date",
};



test.describe.configure({mode: "serial"});



test.beforeAll(async ({browser}) => {

    const token = String(Date.now() % 1000000);

    const drivers = await seedComplianceTrackerDrivers(prisma, tracker, token);

    seed = {token, ...drivers} as ComplianceTrackerSeed;



    const context = await browser.newContext({storageState: authFile});

    const page = await context.newPage();

    try {

        await deleteAllTestForms(page, prisma);

        const forms = await seedComplianceTrackerForms(page, prisma, tracker, token);

        Object.assign(seed, forms);

        await fileDriverFormExpiring(prisma, tracker, seed.w2DriverId, seed.expiringForm.formId, 15);

        await fileAllCadenceDemonstrations(prisma, tracker, seed.w2DriverId, seed.cadenceForms);

    } finally {

        await context.close();

    }



    // eslint-disable-next-line no-console -- intentional post-run inspection hints

    console.log("[compliance trackers] Seed left in DB for inspection:", {

        w2Driver: `${seed.w2DriverName} (id ${seed.w2DriverId})`,

        ooDriver: `${seed.ooDriverName} (id ${seed.ooDriverId})`,

        forms: [

            TRACKER_W2_FORM_LABEL,

            TRACKER_OO_FORM_LABEL,

            TRACKER_EXPIRING_FORM_LABEL,

            TRACKER_FLEET_WIDE_FORM_LABEL,

            TRACKER_PDF_FORM_LABEL,

            ...CADENCES.map((c) => CADENCE_FORM_LABELS[c]),

        ],

        pages: ["/drivers/form-options", "/drivers/w2_forms", "/drivers/owner_forms", "/drivers/expiring-soon"],

    });

});



test.afterAll(async () => {

    await prisma.$disconnect();

});



function w2DriverRow(page: Page) {

    return page

        .locator(".MuiGrid2-container")

        .filter({has: page.getByRole("link", {name: seed.w2DriverName})})

        .last();

}



async function openDriversComplianceNav(page: Page) {

    await page.goto("/drivers/w2_forms");

    await expect(page.getByRole("link", {name: "W2 Forms"})).toBeVisible({timeout: 15000});

}



function w2ExpiringBlock(page: Page) {

    return page.locator(".MuiPaper-root").filter({hasText: seed.w2DriverName}).first();

}



test("form-options shows recreated tracker and cadence forms", async ({page}) => {

    await page.goto("/drivers/form-options");

    for (const label of [

        seed.w2Form.displayName,

        seed.ooForm.displayName,

        seed.expiringForm.displayName,

        seed.fleetWideForm.displayName,

        seed.pdfForm.displayName,

        ...CADENCES.map((c) => seed.cadenceForms[c].displayName),

    ]) {

        await expect(page.getByRole("row").filter({hasText: label})).toBeVisible({timeout: 15000});

    }



    const rollingRow = page.getByRole("row").filter({hasText: seed.cadenceForms.ROLLING_MONTHS.displayName});
    await expect(rollingRow.getByText("Rolling months from submitted date")).toBeVisible();
    await expect(rollingRow.getByLabel("Validity (months)")).toHaveValue("1");

    for (const cadence of CADENCES) {
        const row = page.getByRole("row").filter({hasText: seed.cadenceForms[cadence].displayName});
        await expect(row.getByText(CADENCE_EXPIRY_LABELS[cadence])).toBeVisible();
    }



    const fleetRow = page.getByRole("row").filter({hasText: seed.fleetWideForm.displayName});

    await expect(fleetRow.locator("input[type='checkbox']").nth(4)).toBeChecked();



    const pdfRow = page.getByRole("row").filter({hasText: seed.pdfForm.displayName});

    await expect(pdfRow.locator("input[type='checkbox']").nth(5)).toBeChecked();

    const w2Row = page.getByRole("row").filter({hasText: seed.w2Form.displayName});

    await expect(w2Row.locator("input[type='checkbox']").nth(5)).toBeChecked();

    await expect(w2Row.locator("input[type='checkbox']").nth(5)).toBeDisabled();

});



test("sidenav compliance submenu shows tracker badges", async ({page}) => {

    await openDriversComplianceNav(page);



    const w2Item = page.getByRole("link", {name: "W2 Forms"});

    await expect(w2Item.locator("xpath=..").locator("span").filter({hasText: /^\d+$/}).first()).toBeVisible({

        timeout: 15000,

    });



    const expItem = page.getByRole("link", {name: "Exp Soon"});

    await expect(expItem.locator("xpath=..").locator("span").filter({hasText: /^\d+$/}).first()).toBeVisible({

        timeout: 15000,

    });

});



test("w2_forms grid flags missing required tracker form", async ({page}) => {

    const col = await w2FormColumnIndex(prisma, seed.w2Form.formId);

    await page.goto("/drivers/w2_forms");

    const row = w2DriverRow(page);

    await expect(row).toBeVisible({timeout: 15000});

    await expect(row.locator("input[type='checkbox']").nth(col)).not.toBeChecked();

    await expect(row.getByText("*")).toBeVisible();

});



test("missing required W2 driver has asterisk on grid and is not Done for PDF", async ({page}) => {

    await page.goto("/drivers/w2_forms");

    await expect(w2DriverRow(page).getByText("*")).toBeVisible();

    const driver = await prisma.drivers.findUnique({

        where: {ID: seed.w2DriverId},

        include: {DriverForms: true},

    });

    const allForms = await prisma.formOptions.findMany({

        where: {W2Visible: true},

        include: {Forms: true},

    });

    const {isW2DriverDoneOnPdf} = await import("../../src/utils/driverFormsPdf");

    const shape = {

        ID: seed.w2DriverId,

        CarrierID: driver?.CarrierID ?? null,

        OwnerOperator: false,

        DriverForms: (driver?.DriverForms ?? []).map((df) => ({

            Form: df.Form,

            Expiration: df.Expiration,

            Created: df.Created,

            CarrierID: df.CarrierID,

            Filer: df.Filer,

        })),

    };

    expect(isW2DriverDoneOnPdf(shape, allForms, [shape])).toBe(false);

    const w2FormOpt = allForms.find((f) => f.Form === seed.w2Form.formId);

    expect(w2FormOpt?.W2Required).toBe(true);

    expect(w2FormOpt?.IncludeInPdf).toBe(true);

});



test("w2_forms filing clears missing-required marker", async ({page}) => {

    const col = await w2FormColumnIndex(prisma, seed.w2Form.formId);

    await page.goto("/drivers/w2_forms");

    const row = w2DriverRow(page);

    const checkbox = row.locator("input[type='checkbox']").nth(col);

    await checkbox.click();



    const dateInput = page.getByLabel("Expiration date");

    await expect(dateInput).toBeVisible({timeout: 10000});

    await dateInput.click();

    await dateInput.pressSequentially("12/31/2099");

    await page.getByRole("button", {name: "Save"}).click();

    await expect(page.getByText(/Successfully submitted/i)).toBeVisible({timeout: 30000});

    await expect(w2DriverRow(page).locator("input[type='checkbox']").nth(col)).toBeChecked({timeout: 30000});

});



test("rolling months form filing shows rolling expiry preview in modal", async ({page}) => {
    const col = await w2FormColumnIndex(prisma, seed.cadenceForms.ROLLING_MONTHS.formId);
    await page.goto("/drivers/w2_forms");
    const row = w2DriverRow(page);
    await row.locator("input[type='checkbox']").nth(col).click();

    await expect(page.getByText("Rolling months")).toBeVisible({timeout: 10000});
    await expect(page.getByText(/expires 1 month\(s\) later/i)).toBeVisible();

    const dateInput = page.getByLabel("Select date");
    await dateInput.click();
    const rollingCreated = new Date();
    rollingCreated.setDate(rollingCreated.getDate() - 25);
    const mm = String(rollingCreated.getMonth() + 1).padStart(2, "0");
    const dd = String(rollingCreated.getDate()).padStart(2, "0");
    const yyyy = rollingCreated.getFullYear();
    await dateInput.pressSequentially(`${mm}/${dd}/${yyyy}`);
    await expect(page.getByText(/Expires on.*1 month\(s\) rolling/i)).toBeVisible();
    await page.getByRole("button", {name: "Save"}).click();
    await expect(page.getByText(/Successfully submitted/i)).toBeVisible({timeout: 30000});
});



test("owner_forms grid flags missing required OO tracker form", async ({page}) => {

    const col = await ooFormColumnIndex(prisma, seed.ooForm.formId);

    await page.goto("/drivers/owner_forms");

    await expect(page.getByText(seed.ooDriverName)).toBeVisible({timeout: 15000});

    await expect(ooEntityRow(page, seed.ooDriverName).locator("input[type='checkbox']").nth(col)).not.toBeChecked();

});



test("fleet-wide OO form is not required with one truck then required with two", async ({page}) => {
    await fileDriverFormExpiring(prisma, tracker, seed.ooDriverId, seed.ooForm.formId, 400);

    expect(await countDistinctTrucksForOoDriver(prisma, seed.ooDriverId)).toBe(1);

    await page.goto("/drivers/owner_forms");
    const block = ooEntityBlock(page, seed.ooDriverName);
    await expect(block).toBeVisible({timeout: 15000});
    await expect(block.getByTestId("CheckIcon")).toBeVisible();

    seed.ooTruck2Id = await seedSecondOoTruck(prisma, tracker, seed.ooDriverId, seed.token);
    expect(await countDistinctTrucksForOoDriver(prisma, seed.ooDriverId)).toBe(2);

    await page.goto("/drivers/owner_forms");
    await expect(
        page.getByLabel(`Forms: ${TRACKER_FLEET_WIDE_FORM_LABEL}`, {exact: true}),
    ).toBeVisible({timeout: 15000});

    const col = await ooFormColumnIndex(prisma, seed.fleetWideForm.formId);
    const fleetCheckbox = ooEntityRow(page, seed.ooDriverName).locator("input[type='checkbox']").nth(col);
    await expect(fleetCheckbox).not.toBeChecked();
});



test("owner_forms filing satisfies OO entity tracker form", async ({page}) => {
    const col = await ooFormColumnIndex(prisma, seed.fleetWideForm.formId);
    await page.goto("/drivers/owner_forms");
    const entityRow = ooEntityRow(page, seed.ooDriverName);
    const checkbox = entityRow.locator("input[type='checkbox']").nth(col);
    await expect(checkbox).not.toBeChecked();
    await checkbox.click();



    const dateInput = page.getByLabel("Expiration date");

    await expect(dateInput).toBeVisible({timeout: 10000});

    await dateInput.click();

    await dateInput.pressSequentially("12/31/2099");

    await page.getByRole("button", {name: "Save"}).click();

    await expect(page.getByText(/Successfully submitted/i)).toBeVisible({timeout: 30000});

    await expect(checkbox).toBeChecked({timeout: 30000});

});



test("expiring-soon lists each qualifying cadence with correct cadence column", async ({page}) => {

    await page.goto("/drivers/expiring-soon");

    await expect(page.getByText("Forms expiring soon")).toBeVisible({timeout: 15000});



    const block = w2ExpiringBlock(page);

    await expect(block).toBeVisible({timeout: 20000});



    for (const cadence of CADENCES) {

        const label = seed.cadenceForms[cadence].displayName;

        const qualifies = await cadenceQualifiesForExpSoonFromDb(
            prisma,
            seed.w2DriverId,
            seed.cadenceForms[cadence].formId,
            cadence,
            cadence === "ROLLING_MONTHS" ? 1 : null,
        );

        const row = block.getByRole("row").filter({hasText: label});

        if (qualifies) {

            await expect(row).toBeVisible();

            await expect(row.getByText(expSoonCadenceCellLabel(cadence))).toBeVisible();

            const endLabel = await expectedExpSoonEndDateLabelFromDb(
                prisma,
                seed.w2DriverId,
                seed.cadenceForms[cadence].formId,
                cadence,
                cadence === "ROLLING_MONTHS" ? 1 : null,
            );

            if (endLabel) {

                await expect(row.getByText(endLabel)).toBeVisible();

            }

        } else {

            await expect(row).toHaveCount(0);

        }

    }



    await expect(block.getByRole("row").filter({hasText: seed.expiringForm.displayName})).toBeVisible();

    await expect(

        block.getByRole("row").filter({hasText: seed.cadenceForms.NONE.displayName}),

    ).toHaveCount(0);

});



test("w2 PDF download is valid and returns a non-trivial PDF", async ({request}) => {

    const res = await request.get("/api/getPDF/driver-forms/w2");

    expect(res.status()).toBe(200);

    expect(res.headers()["content-type"]).toContain("pdf");

    const body = await res.body();

    expect(body.slice(0, 4).toString()).toBe("%PDF");

    expect(body.length).toBeGreaterThan(1000);

    const pdfForm = await prisma.formOptions.findFirst({
        where: {Form: seed.pdfForm.formId},
    });
    expect(pdfForm?.IncludeInPdf).toBe(true);
    expect(pdfForm?.PdfColumnLabel).toBe(TRACKER_PDF_COLUMN_LABEL);

    const w2RequiredForm = await prisma.formOptions.findFirst({
        where: {Form: seed.w2Form.formId},
    });
    expect(w2RequiredForm?.W2Required).toBe(true);
    expect(w2RequiredForm?.IncludeInPdf).toBe(true);

});



test("oo PDF download is valid and returns a non-trivial PDF", async ({request}) => {

    const res = await request.get("/api/getPDF/driver-forms/oo");

    expect(res.status()).toBe(200);

    expect(res.headers()["content-type"]).toContain("pdf");

    const body = await res.body();

    expect(body.slice(0, 4).toString()).toBe("%PDF");

    expect(body.length).toBeGreaterThan(500);

});



test("w2_forms Download PDF button yields a valid PDF file", async ({page}) => {

    await page.goto("/drivers/w2_forms");

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", {name: "Download PDF"}).click();

    const download = await downloadPromise;

    const downloadPath = await download.path();

    expect(downloadPath).toBeTruthy();

    const fs = await import("fs");

    const buf = fs.readFileSync(downloadPath!);

    expect(buf.slice(0, 4).toString()).toBe("%PDF");

    expect(buf.length).toBeGreaterThan(1000);

});



test("w2_forms Edit forms link opens the driver profile Forms tab", async ({page}) => {

    await page.goto("/drivers/w2_forms");

    const row = w2DriverRow(page);

    await expect(row).toBeVisible({timeout: 15000});

    await row.getByRole("link", {name: "Edit forms"}).click();

    await expect(page).toHaveURL(new RegExp(`/drivers/${seed.w2DriverId}\\?tab=forms`), {timeout: 15000});

    await expect(page.getByRole("heading", {name: "Required forms"})).toBeVisible({timeout: 15000});

});



test("driver profile Forms tab shows tracker forms and cadence copy", async ({page}) => {

    await page.goto(`/drivers/${seed.w2DriverId}?tab=forms`);

    await page.getByRole("tab", {name: /Forms/i}).click();



    await expect(page.getByRole("heading", {name: "Required forms"})).toBeVisible({timeout: 15000});

    await expect(

        page.locator(".MuiPaper-root").filter({hasText: seed.w2Form.displayName}).first(),

    ).toBeVisible();



    const rollingCard = page

        .locator(".MuiPaper-root")

        .filter({hasText: seed.cadenceForms.ROLLING_MONTHS.displayName})

        .first();

    await expect(rollingCard).toContainText(/Expiring soon|rolling month/i);



    const noneCard = page.locator(".MuiPaper-root").filter({hasText: seed.cadenceForms.NONE.displayName}).first();

    await expect(noneCard).toContainText(/On file|Does not expire/i);

    const expDateCard = page
        .locator(".MuiPaper-root")
        .filter({hasText: seed.cadenceForms.EXPIRATION_DATE.displayName})
        .first();
    await expect(expDateCard).toContainText(/On file|Expiring soon|expires/i);

    const calMonthCard = page
        .locator(".MuiPaper-root")
        .filter({hasText: seed.cadenceForms.CALENDAR_MONTH.displayName})
        .first();
    await expect(calMonthCard).toContainText(/On file|Expiring soon|calendar month/i);
});


