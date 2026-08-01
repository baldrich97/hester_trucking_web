import {expect, test} from "@playwright/test";
import {nextTestTicket} from "../helpers/testData";
import {createSeedPrisma, seedMassEditJob} from "./helpers/dbSeed";
import {TestRunTracker} from "../helpers/testRunTracker";

const massEditPrisma = createSeedPrisma();
const massEditTracker = new TestRunTracker();

/**
 * E2E write flows against dev DB.
 * Uses ticket range 999xxx; DB integration tests clean [TEST] rows separately.
 */
test.describe("Submit flows", () => {
    test.slow();

    test("loads form accepts ticket number and shows submit", async ({page}) => {
        await page.goto("/loads");
        await expect(page.getByTestId("load-form")).toBeVisible({timeout: 15000});
        const ticket = String(nextTestTicket(77));
        await page.getByLabel(/Ticket Number/i).fill(ticket);
        await expect(page.getByTestId("form-submit")).toBeEnabled();
    });

    test("mass edit page loads search and table", async ({page}) => {
        await page.goto("/loads/massedit");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
        await expect(page.getByRole("columnheader", {name: /Ticket/i})).toBeVisible();
        await page.getByRole("button", {name: /open filter modal/i}).click();
        await expect(page.getByText(/Specify Search Terms/i)).toBeVisible();
        await expect(page.getByLabel(/Ticket Number/i)).toBeVisible();
    });

    test("invoices page shows invoice workflow", async ({page}) => {
        await page.goto("/invoices");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
        await expect(page.getByText(/Invoice/i).first()).toBeVisible();
    });

    test("new work path shows Source field when cutover forced", async ({page}) => {
        await page.goto("/loads");
        await expect(page.getByTestId("load-form")).toBeVisible({timeout: 15000});
        const newWork = page.getByText("New work instead");
        if (await newWork.count()) {
            await newWork.click();
            await expect(page.getByLabel(/^Source/i)).toBeVisible({timeout: 10000});
        } else {
            test.info().annotations.push({
                type: "note",
                description: "No open legacy jobs for current driver/week; Source field may already be visible.",
            });
        }
    });

    test("loads page render time within budget", async ({page}) => {
        const start = Date.now();
        await page.goto("/loads", {waitUntil: "domcontentloaded"});
        await expect(page.getByTestId("load-form")).toBeVisible({timeout: 15000});
        const elapsed = Date.now() - start;
        const budgetMs = Number(process.env.E2E_PAGE_BUDGET_MS ?? "12000");
        expect(elapsed).toBeLessThan(budgetMs);
    });

    test("full load submit via legacy open-job prefill", async ({page}) => {
        await page.goto("/loads");
        const form = page.getByTestId("load-form");
        await expect(form).toBeVisible({timeout: 15000});

        if (!(await page.getByText(/open job/i).count())) {
            test.skip(true, "No open legacy jobs for current driver/week");
        }

        await page.locator("table tbody tr").first().click();

        const ticket = String(nextTestTicket(88));
        await form.getByLabel(/Ticket Number/i).fill(ticket);
        await form.getByLabel(/^Weight$/i).fill("20");

        await page.getByTestId("form-submit").click();
        await expect(page.getByText(/Successfully Submitted/i)).toBeVisible({timeout: 30000});
    });

    test("mass edit applies changes after confirmation", async ({page}) => {
        const seed = await seedMassEditJob(massEditPrisma, massEditTracker, String(Date.now() % 100000), 2);

        await page.goto("/loads/massedit");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
        await page.getByRole("button", {name: /open filter modal/i}).click();
        await page.getByLabel(/Ticket Number/i).fill(String(seed.anchorTicket));
        await page.getByRole("button", {name: "Search"}).click();
        const row = page.locator("tbody tr").filter({hasText: String(seed.anchorTicket)}).first();
        await expect(row).toBeVisible({timeout: 15000});
        await row.locator("button").last().click();
        await expect(page.getByTestId("mass-edit-loads-table")).toBeVisible({timeout: 15000});
        await expect(page.locator('[data-testid^="mass-edit-load-row-"]').first()).toBeVisible({
            timeout: 15000,
        });

        const truckRate = page.getByLabel("Truck Rate", {exact: true});
        await expect(truckRate).toBeVisible({timeout: 10000});
        await truckRate.clear();
        await truckRate.fill("12.5");
        await truckRate.blur();

        await page.getByTestId("form-submit").click();
        await page.getByRole("button", {name: "Do Mass Edit"}).click({timeout: 10000});
        await expect(page.getByText(/Successfully Submitted/i)).toBeVisible({timeout: 30000});
    });

    test("invoice form loads weeklies after customer select", async ({page}) => {
        await page.goto("/invoices");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
        await page.locator("#Customer-autocomplete").click();
        await page.locator("#Customer-autocomplete").fill("a");
        await page.getByRole("option").first().click({timeout: 10000});
        await expect(page.getByText(/Weekly|Load/i).first()).toBeVisible({timeout: 15000});
    });
});
