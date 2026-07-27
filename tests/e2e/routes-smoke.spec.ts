import {test, expect} from "@playwright/test";

const ROUTES = [
    "/",
    "/loads",
    "/loads/massedit",
    "/invoices",
    "/invoices/overdue",
    "/dailies",
    "/dailies/w2",
    "/dailies/operator",
    "/dailies/not_printed",
    "/weeklies",
    "/weeklies/not_printed",
    "/paystubs",
    "/reports",
    "/reports/customers",
    "/sources",
    "/customers",
    "/drivers",
    "/drivers/w2_forms",
    "/drivers/owner_forms",
    "/drivers/form-options",
    "/drivers/expiring-soon",
    "/trucks",
    "/carriers",
    "/carriers/compliance",
    "/deliverylocations",
    "/loadtypes",
];

for (const route of ROUTES) {
    test(`page loads: ${route}`, async ({page}) => {
        const response = await page.goto(route, {waitUntil: "domcontentloaded"});
        expect(response?.status()).toBeLessThan(500);
        expect(page.url()).not.toContain("/api/auth/signin");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
    });
}

test("loads page shows load form area", async ({page}) => {
    await page.goto("/loads");
    await expect(page.getByLabel(/Ticket Number/i)).toBeVisible({timeout: 15000});
});
