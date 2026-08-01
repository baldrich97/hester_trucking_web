import {expect, type Locator, type Page} from "@playwright/test";

type SelectOptions = {
    /** Scope autocomplete to a container (e.g. load form). */
    root?: Locator;
};

/** Type into a MUI Autocomplete and pick the first matching option. */
export async function selectAutocompleteOption(
    page: Page,
    label: string,
    query: string,
    options?: SelectOptions,
): Promise<void> {
    const scope = options?.root ?? page;
    const input = scope.getByLabel(label, {exact: true});
    await input.click();
    await input.fill(query);
    const listboxOption = page.getByRole("option").first();
    await listboxOption.waitFor({state: "visible", timeout: 10000});
    await listboxOption.click();
}

/** Open an autocomplete on the load form and choose its inline "New …" row. */
export async function pickInlineCreateOption(
    page: Page,
    fieldLabel: string,
    newOptionLabel: string,
    options?: SelectOptions,
): Promise<void> {
    const scope = options?.root ?? page;
    const input = scope.getByLabel(fieldLabel, {exact: true});
    await input.click();
    const option = page.getByRole("option", {name: newOptionLabel});
    await expect(option).toBeVisible({timeout: 10000});
    await option.click();
}

/** Modal opened from the loads form inline-create flow. */
export function inlineCreateModal(page: Page, entityTitle: string): Locator {
    return page.locator(".MuiModal-root").filter({
        has: page.getByRole("heading", {name: `Create ${entityTitle}`}),
    });
}

export async function createInModal(
    page: Page,
    entityTitle: string,
    fill: (modal: Locator) => Promise<void>,
): Promise<void> {
    const modal = inlineCreateModal(page, entityTitle);
    await expect(modal).toBeVisible({timeout: 10000});
    await fill(modal);
    await modal.getByRole("button", {name: "Create"}).click();
    await expect(modal).toBeHidden({timeout: 15000});
}

/** Home dashboard (`/`) load entry form in the Data Input tab. */
export async function openDashboardLoadForm(page: Page): Promise<Locator> {
    await page.goto("/");
    const form = page.getByTestId("load-form");
    await expect(form).toBeVisible({timeout: 15000});
    return form;
}
