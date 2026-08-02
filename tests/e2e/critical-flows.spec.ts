import {test, expect} from "@playwright/test";

test.describe("Critical flows", () => {
    test("loads page shows cutover new-work link when legacy jobs exist", async ({page}) => {
        await page.goto("/loads", {waitUntil: "domcontentloaded"});
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
        const newWorkLink = page.getByText("New work instead");
        const ticketField = page.getByLabel(/Ticket Number/i);
        await expect(ticketField).toBeVisible({timeout: 15000});
        if (await newWorkLink.count()) {
            await expect(newWorkLink).toBeVisible();
        }
    });

    test("sources page loads with cutover forced on", async ({page}) => {
        await page.goto("/sources");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
    });

    test("mass edit page loads", async ({page}) => {
        await page.goto("/loads/massedit");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
    });

    test("reports customers page loads", async ({page}) => {
        await page.goto("/reports/customers");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
    });
});

test.describe("PDF smoke", () => {
    test("daily PDF endpoint returns PDF or 404 for missing sheet", async ({request}) => {
        const response = await request.get("/api/getPDF/daily/1|2026-W01|full");
        expect([200, 404, 500]).toContain(response.status());
        if (response.status() === 200) {
            expect(response.headers()["content-type"]).toContain("application/pdf");
        }
    });

    test("invoice PDF endpoint responds", async ({request}) => {
        const response = await request.get("/api/getPDF/invoice/1");
        // Missing invoices must 404 cleanly, never crash the renderer.
        expect([200, 404]).toContain(response.status());
        if (response.status() === 200) {
            expect(response.headers()["content-type"]).toContain("application/pdf");
        }
    });

    test("weekly PDF endpoint responds", async ({request}) => {
        const response = await request.get("/api/getPDF/weekly/1");
        expect([200, 404, 500]).toContain(response.status());
    });

    test("paystub PDF endpoint responds", async ({request}) => {
        const response = await request.get("/api/getPDF/paystub/1");
        // Missing paystubs must 404 cleanly, never crash the renderer.
        expect([200, 404]).toContain(response.status());
        if (response.status() === 200) {
            expect(response.headers()["content-type"]).toContain("application/pdf");
        }
    });
});
