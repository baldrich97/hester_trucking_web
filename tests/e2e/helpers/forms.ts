import type {Locator, Page} from "@playwright/test";

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
