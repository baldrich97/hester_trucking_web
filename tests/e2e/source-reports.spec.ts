import {expect, test} from "@playwright/test";

import {TestRunTracker} from "../helpers/testRunTracker";

import {createSeedPrisma, seedSourceReportFixture, type SourceReportSeed} from "./helpers/dbSeed";
import {selectAutocompleteOption} from "./helpers/forms";

const prisma = createSeedPrisma();
const tracker = new TestRunTracker();

let seed: SourceReportSeed;

test.beforeAll(async () => {
    const token = String(Date.now() % 100000);
    seed = await seedSourceReportFixture(prisma, tracker, token);
});

test.afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

async function runSourceReport(
    page: import("@playwright/test").Page,
    startDate: string,
    endDate: string,
) {
    await page.goto("/reports");
    await selectAutocompleteOption(page, "Source", seed.sourceQuery);
    await page.getByLabel("Start Date", {exact: true}).fill(startDate);
    await page.getByLabel("End Date", {exact: true}).fill(endDate);
    await page.getByRole("button", {name: "Run Report"}).click();
    await expect(page.getByText("Total Loads")).toBeVisible({timeout: 15000});
}

test("source report shows a load on its start date and hides it outside the range", async ({page}) => {
    await runSourceReport(page, "2099-03-01", "2099-03-31");
    await expect(page.getByRole("cell", {name: String(seed.ticket)})).toBeVisible({timeout: 15000});

    await runSourceReport(page, "2099-02-01", "2099-02-28");
    await expect(page.getByRole("cell", {name: String(seed.ticket)})).toHaveCount(0);
});

test("customer report shows a load on its start date and hides it outside the range", async ({page}) => {
    await page.goto("/reports/customers");
    await selectAutocompleteOption(page, "Customer", seed.customerQuery);
    await page.getByLabel("Start Date", {exact: true}).fill("2099-03-01");
    await page.getByLabel("End Date", {exact: true}).fill("2099-03-31");
    await page.getByRole("button", {name: "Run Report"}).click();
    await expect(page.getByText("Total Loads")).toBeVisible({timeout: 15000});
    await expect(page.getByRole("cell", {name: String(seed.ticket)})).toBeVisible();

    await page.getByLabel("End Date", {exact: true}).fill("2099-03-05");
    await page.getByRole("button", {name: "Run Report"}).click();
    await expect(page.getByRole("cell", {name: String(seed.ticket)})).toHaveCount(0);
});
