import {test as setup, expect} from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth", "user.json");

setup("authenticate", async ({page}) => {
    await page.goto("/api/auth/signin");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin123$");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/api/auth/signin"), {timeout: 30000});
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
    await page.context().storageState({path: authFile});
});
