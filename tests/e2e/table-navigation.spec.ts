import {expect, test} from "@playwright/test";

/** List pages backed by GenericTable (0-based server page). */
const GENERIC_TABLE_ROUTES: Array<{
    route: string;
    sortLabel?: RegExp;
    filterLabel?: RegExp;
}> = [
    {route: "/customers", sortLabel: /name/i},
    {route: "/drivers", sortLabel: /name/i},
    {route: "/trucks", sortLabel: /name/i},
    {route: "/carriers", sortLabel: /name/i},
    {route: "/deliverylocations", sortLabel: /description/i},
    {route: "/loadtypes", sortLabel: /description/i},
    {route: "/sources", sortLabel: /name/i},
    {route: "/paystubs", sortLabel: /driver/i},
    {route: "/loads", sortLabel: /ticket/i},
    {route: "/loads/massedit", sortLabel: /ticket/i},
    {route: "/invoices", sortLabel: /customer/i, filterLabel: /filter/i},
    {route: "/invoices/overdue", sortLabel: /customer/i},
];

/** Sheet list pages with 1-based page chevrons. */
const PAGINATED_SHEET_ROUTES = [
    "/weeklies/not_printed",
    "/dailies/not_printed",
    "/dailies/w2",
    "/dailies/operator",
];

/** Week calendar navigation (prev / next week). */
const WEEK_CALENDAR_ROUTES = ["/dailies", "/weeklies"];

test.describe("GenericTable navigation", () => {
    for (const {route, sortLabel, filterLabel} of GENERIC_TABLE_ROUTES) {
        test(`${route}: pagination and sort controls respond`, async ({page}) => {
            await page.goto(route, {waitUntil: "domcontentloaded"});
            await expect(page.locator("main")).toBeVisible({timeout: 15000});

            const table = page.getByRole("table").first();
            await expect(table).toBeVisible({timeout: 15000});

            if (sortLabel) {
                const sortButton = table.getByRole("button", {name: sortLabel}).first();
                if (await sortButton.count()) {
                    await sortButton.click();
                }
            }

            const nextPage = page.getByLabel("next page");
            if (await nextPage.count()) {
                const disabled = await nextPage.isDisabled();
                if (!disabled) {
                    await nextPage.click();
                    const prevPage = page.getByLabel("previous page");
                    await expect(prevPage).toBeEnabled();
                    await prevPage.click();
                }
            }

            if (filterLabel) {
                const filterBtn = page.getByRole("button", {name: filterLabel}).first();
                if (await filterBtn.count()) {
                    await filterBtn.click();
                    await expect(page.getByRole("presentation")).toBeVisible({timeout: 5000});
                    await page.keyboard.press("Escape");
                }
            }
        });
    }
});

test.describe("Paginated sheet list navigation", () => {
    for (const route of PAGINATED_SHEET_ROUTES) {
        test(`${route}: page chevrons are present and backward works when forward is available`, async ({page}) => {
            await page.goto(route, {waitUntil: "domcontentloaded"});
            await expect(page.locator("main")).toBeVisible({timeout: 15000});

            const next = page.getByRole("button", {name: "Next page"});
            const prev = page.getByRole("button", {name: "Previous page"});

            if ((await next.count()) === 0) {
                // No rows / nav hidden — smoke only.
                return;
            }

            await expect(prev).toBeDisabled();

            if (await next.isEnabled()) {
                const labelBefore = await page.locator("b").filter({hasText: /^Page \d+/}).innerText();
                await next.click();
                await expect(prev).toBeEnabled({timeout: 15000});

                const labelAfter = await page.locator("b").filter({hasText: /^Page \d+/}).innerText();
                expect(labelAfter).not.toBe(labelBefore);

                await prev.click();
                await expect(page.locator("b").filter({hasText: labelBefore})).toBeVisible({timeout: 15000});
            }
        });
    }
});

test.describe("Week calendar navigation", () => {
    for (const route of WEEK_CALENDAR_ROUTES) {
        test(`${route}: previous week button changes the week label`, async ({page}) => {
            await page.goto(route, {waitUntil: "domcontentloaded"});
            await expect(page.locator("main")).toBeVisible({timeout: 15000});

            const prevWeek = page.getByRole("button", {name: /previous week/i});
            await expect(prevWeek).toBeVisible({timeout: 15000});

            const weekLabel = page.getByRole("button", {name: /current week range/i});
            const before = await weekLabel.innerText();

            await prevWeek.click();
            await expect(weekLabel).not.toHaveText(before, {timeout: 15000});
        });
    }
});
