import {test, expect} from "@playwright/test";

type DetailRoute = {
    listPath: string;
    detailPrefix: string;
    label: string;
};

const DETAIL_ROUTES: DetailRoute[] = [
    {listPath: "/loads", detailPrefix: "/loads/", label: "loads"},
    {listPath: "/invoices", detailPrefix: "/invoices/", label: "invoices"},
    {listPath: "/paystubs", detailPrefix: "/paystubs/", label: "paystubs"},
    {listPath: "/customers", detailPrefix: "/customers/", label: "customers"},
    {listPath: "/drivers", detailPrefix: "/drivers/", label: "drivers"},
    {listPath: "/trucks", detailPrefix: "/trucks/", label: "trucks"},
    {listPath: "/sources", detailPrefix: "/sources/", label: "sources"},
];

for (const route of DETAIL_ROUTES) {
    test(`detail page loads: ${route.label}`, async ({page}) => {
        await page.goto(route.listPath, {waitUntil: "domcontentloaded"});
        await expect(page.locator("main")).toBeVisible({timeout: 15000});

        const detailPattern = new RegExp(`^${route.detailPrefix}\\d+$`);
        const candidates = page.locator(`main a[href^="${route.detailPrefix}"]`);
        const count = await candidates.count();
        let href: string | null = null;
        for (let i = 0; i < count; i++) {
            const candidate = await candidates.nth(i).getAttribute("href");
            if (candidate && detailPattern.test(candidate)) {
                href = candidate;
                break;
            }
        }

        if (!href) {
            test.skip(true, `No ${route.label} detail links with numeric IDs`);
        }

        await page.goto(href!, {waitUntil: "domcontentloaded"});
        expect(page.url()).toMatch(new RegExp(`${route.detailPrefix}\\d+`));
        expect(page.url()).not.toContain("/api/auth/signin");
        await expect(page.locator("main")).toBeVisible({timeout: 15000});
    });
}
