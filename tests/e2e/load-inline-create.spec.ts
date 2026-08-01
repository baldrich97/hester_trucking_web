import {expect, test} from "@playwright/test";
import {NEW_LOAD_TYPE_ID_THRESHOLD} from "../../src/config/sourcesCutover";
import {nextTestTicket, TEST_NAME_PREFIX} from "../helpers/testData";
import {TestRunTracker} from "../helpers/testRunTracker";
import {createSeedPrisma, seedOpenLegacyJob, type OpenLegacyJobSeed} from "./helpers/dbSeed";
import {
    createInModal,
    openDashboardLoadForm,
    pickInlineCreateOption,
    selectAutocompleteOption,
} from "./helpers/forms";

/**
 * Every "New …" autocomplete option on /loads must work without leaving the page.
 * Cutover is active (SOURCES_CUTOVER_FORCE in .env + Playwright webServer env).
 */

const prisma = createSeedPrisma();
const tracker = new TestRunTracker();
let legacySeed: OpenLegacyJobSeed;

function todayForDatePicker(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${now.getFullYear()}`;
}

async function openNewWorkForm(page: import("@playwright/test").Page) {
    await page.goto("/loads");
    const form = page.getByTestId("load-form");
    await expect(form).toBeVisible({timeout: 15000});
    await selectAutocompleteOption(page, "Driver", legacySeed.driverQuery, {root: form});
    await expect(page.getByText("New work instead")).toBeVisible({timeout: 15000});
    await page.getByText("New work instead").click();
    await expect(page.getByLabel(/^Source/i)).toBeVisible({timeout: 10000});
    return form;
}

test.describe.configure({mode: "serial"});

test.beforeAll(async () => {
    legacySeed = await seedOpenLegacyJob(prisma, tracker, String(Date.now() % 100000));
});

test.afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

test("inline create: New Customer", async ({page}) => {
    const token = String(Date.now() % 100000);
    const form = await openNewWorkForm(page);

    await pickInlineCreateOption(page, "Customer", "New Customer", {root: form});
    await createInModal(page, "Customer", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} InlineCust-${token}`);
        await modal.getByLabel("Street", {exact: true}).fill("100 Inline Way");
        await modal.getByLabel("City", {exact: true}).fill("InlineTown");
        await modal.getByLabel("ZIP", {exact: true}).fill("99999");
    });

    const row = await prisma.customers.findFirst({where: {Name: {contains: `InlineCust-${token}`}}});
    expect(row).toBeTruthy();
    tracker.track("customers", row!.ID);
    await expect(form.getByLabel("Customer", {exact: true})).not.toHaveValue("");
});

test("inline create: New Driver", async ({page}) => {
    const token = String(Date.now() % 100000);
    const form = await openNewWorkForm(page);

    await pickInlineCreateOption(page, "Driver", "New Driver", {root: form});
    await createInModal(page, "Driver", async (modal) => {
        await modal.getByLabel("First Name", {exact: true}).fill("Inline");
        await modal.getByLabel("Last Name", {exact: true}).fill(`Driver-${token}`);
        await modal.getByLabel("Street", {exact: true}).fill("200 Driver Rd");
        await modal.getByLabel("City", {exact: true}).fill("DriveTown");
        await modal.getByLabel("ZIP", {exact: true}).fill("99999");
    });

    const row = await prisma.drivers.findFirst({where: {LastName: {contains: `Driver-${token}`}}});
    expect(row).toBeTruthy();
    tracker.track("drivers", row!.ID);
    await expect(form.getByLabel("Driver", {exact: true})).not.toHaveValue("");
});

test("inline create: New Truck", async ({page}) => {
    const token = String(Date.now() % 100000);
    const form = await openNewWorkForm(page);

    await selectAutocompleteOption(page, "Driver", legacySeed.driverQuery, {root: form});
    await pickInlineCreateOption(page, "Truck", "New Truck", {root: form});
    await createInModal(page, "Truck", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} Truck-${token}`);
    });

    const row = await prisma.trucks.findFirst({where: {Name: {contains: `Truck-${token}`}}});
    expect(row).toBeTruthy();
    tracker.track("trucks", row!.ID);
    await expect(form.getByLabel("Truck", {exact: true})).not.toHaveValue("");
});

test("inline create: New Source", async ({page}) => {
    const token = String(Date.now() % 100000);
    const form = await openNewWorkForm(page);

    await pickInlineCreateOption(page, "Source", "New Source", {root: form});
    await createInModal(page, "Source", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} InlineSrc-${token}`);
        await modal.getByLabel("Short Name (for invoices/PDFs)").fill(`IS-${token.slice(-4)}`);
    });

    const row = await prisma.sources.findFirst({where: {Name: {contains: `InlineSrc-${token}`}}});
    expect(row).toBeTruthy();
    tracker.track("sources", row!.ID);
    await expect(form.getByLabel(/^Source/i)).not.toHaveValue("");
});

test("inline create: New Load Type", async ({page}) => {
    const token = String(Date.now() % 100000);
    const form = await openNewWorkForm(page);

    await pickInlineCreateOption(page, "Source", "New Source", {root: form});
    await createInModal(page, "Source", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} SrcForLT-${token}`);
        await modal.getByLabel("Short Name (for invoices/PDFs)").fill(`LT-${token.slice(-4)}`);
    });
    const source = await prisma.sources.findFirst({where: {Name: {contains: `SrcForLT-${token}`}}});
    expect(source).toBeTruthy();
    tracker.track("sources", source!.ID);

    await pickInlineCreateOption(page, "Load Type", "New Load Type", {root: form});
    await createInModal(page, "Load Type", async (modal) => {
        await modal.getByRole("textbox", {name: "Description"}).fill(`${TEST_NAME_PREFIX} InlineType-${token}`);
    });

    await expect
        .poll(async () => {
            const row = await prisma.loadTypes.findFirst({
                where: {Description: {contains: `InlineType-${token}`}},
            });
            return row?.ID ?? 0;
        }, {timeout: 15000})
        .toBeGreaterThan(0);
    const loadType = await prisma.loadTypes.findFirst({
        where: {Description: {contains: `InlineType-${token}`}},
    });
    expect(loadType).toBeTruthy();
    expect(loadType!.ID).toBeGreaterThanOrEqual(NEW_LOAD_TYPE_ID_THRESHOLD);
    tracker.track("loadTypes", loadType!.ID);
    await expect(form.getByLabel("Load Type", {exact: true})).not.toHaveValue("");
});

test("inline create: New Delivery Location", async ({page}) => {
    const token = String(Date.now() % 100000);
    const form = await openNewWorkForm(page);

    await pickInlineCreateOption(page, "Customer", "New Customer", {root: form});
    await createInModal(page, "Customer", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} CustForDL-${token}`);
        await modal.getByLabel("Street", {exact: true}).fill("300 Cust Ln");
        await modal.getByLabel("City", {exact: true}).fill("CustTown");
        await modal.getByLabel("ZIP", {exact: true}).fill("99999");
    });
    const customer = await prisma.customers.findFirst({where: {Name: {contains: `CustForDL-${token}`}}});
    expect(customer).toBeTruthy();
    tracker.track("customers", customer!.ID);

    await pickInlineCreateOption(page, "Delivery Location", "New Delivery Location", {root: form});
    await createInModal(page, "Delivery Location", async (modal) => {
        await modal.getByRole("textbox", {name: "Description"}).fill(`${TEST_NAME_PREFIX} InlineDL-${token}`);
    });

    const row = await prisma.deliveryLocations.findFirst({
        where: {Description: {contains: `InlineDL-${token}`}},
    });
    expect(row).toBeTruthy();
    tracker.track("deliveryLocations", row!.ID);
    await expect(form.getByLabel("Delivery Location", {exact: true})).not.toHaveValue("");
});

test("new work path: full load submit using only inline-created catalog fields", async ({page}) => {
    const token = String(Date.now() % 100000);
    const form = await openNewWorkForm(page);

    await pickInlineCreateOption(page, "Source", "New Source", {root: form});
    await createInModal(page, "Source", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} FullSrc-${token}`);
        await modal.getByLabel("Short Name (for invoices/PDFs)").fill(`FS-${token.slice(-4)}`);
    });
    const source = await prisma.sources.findFirst({where: {Name: {contains: `FullSrc-${token}`}}});
    expect(source).toBeTruthy();
    tracker.track("sources", source!.ID);

    await pickInlineCreateOption(page, "Customer", "New Customer", {root: form});
    await createInModal(page, "Customer", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} FullCust-${token}`);
        await modal.getByLabel("Street", {exact: true}).fill("400 Full St");
        await modal.getByLabel("City", {exact: true}).fill("FullTown");
        await modal.getByLabel("ZIP", {exact: true}).fill("99999");
    });
    const customer = await prisma.customers.findFirst({where: {Name: {contains: `FullCust-${token}`}}});
    expect(customer).toBeTruthy();
    tracker.track("customers", customer!.ID);

    await pickInlineCreateOption(page, "Load Type", "New Load Type", {root: form});
    await createInModal(page, "Load Type", async (modal) => {
        await modal.getByRole("textbox", {name: "Description"}).fill(`${TEST_NAME_PREFIX} FullType-${token}`);
    });
    const loadType = await prisma.loadTypes.findFirst({
        where: {Description: {contains: `FullType-${token}`}},
    });
    expect(loadType).toBeTruthy();
    tracker.track("loadTypes", loadType!.ID);

    await pickInlineCreateOption(page, "Delivery Location", "New Delivery Location", {root: form});
    await createInModal(page, "Delivery Location", async (modal) => {
        await modal.getByRole("textbox", {name: "Description"}).fill(`${TEST_NAME_PREFIX} FullDL-${token}`);
    });
    const deliveryLocation = await prisma.deliveryLocations.findFirst({
        where: {Description: {contains: `FullDL-${token}`}},
    });
    expect(deliveryLocation).toBeTruthy();
    tracker.track("deliveryLocations", deliveryLocation!.ID);

    await selectAutocompleteOption(page, "Truck", "a", {root: form});

    const ticket = String(nextTestTicket(94));
    await form.getByLabel(/Ticket Number/i).fill(ticket);
    await form.getByLabel(/^Weight$/i).fill("20");
    await form.getByLabel("Delivered On").fill(todayForDatePicker());
    await page.getByTestId("form-submit").click();
    await expect(page.getByText(/Successfully Submitted/i)).toBeVisible({timeout: 30000});

    const load = await prisma.loads.findFirst({where: {TicketNumber: Number(ticket)}});
    expect(load).toBeTruthy();
    tracker.track("loads", load!.ID);
    expect(load!.LoadTypeID).toBe(loadType!.ID);
    expect(load!.LoadTypeID).toBeGreaterThanOrEqual(NEW_LOAD_TYPE_ID_THRESHOLD);
    expect(load!.SourceID).toBe(source!.ID);
    expect(load!.CustomerID).toBe(customer!.ID);
    expect(load!.DeliveryLocationID).toBe(deliveryLocation!.ID);
    expect(load!.JobID).not.toBe(legacySeed.jobId);
});

test("dashboard: inline-create every select and submit load with all FKs", async ({page}) => {
    const token = String(Date.now() % 100000);
    const form = await openDashboardLoadForm(page);

    await pickInlineCreateOption(page, "Driver", "New Driver", {root: form});
    await createInModal(page, "Driver", async (modal) => {
        await modal.getByLabel("First Name", {exact: true}).fill("Dash");
        await modal.getByLabel("Last Name", {exact: true}).fill(`Inline-${token}`);
        await modal.getByLabel("Street", {exact: true}).fill("1 Dashboard Dr");
        await modal.getByLabel("City", {exact: true}).fill("DashTown");
        await modal.getByLabel("ZIP", {exact: true}).fill("99999");
    });
    const driver = await prisma.drivers.findFirst({where: {LastName: {contains: `Inline-${token}`}}});
    expect(driver).toBeTruthy();
    tracker.track("drivers", driver!.ID);

    await expect(form.getByLabel(/^Source/i)).toBeVisible({timeout: 10000});

    await pickInlineCreateOption(page, "Source", "New Source", {root: form});
    await createInModal(page, "Source", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} DashSrc-${token}`);
        await modal.getByLabel("Short Name (for invoices/PDFs)").fill(`DS-${token.slice(-4)}`);
    });
    const source = await prisma.sources.findFirst({where: {Name: {contains: `DashSrc-${token}`}}});
    expect(source).toBeTruthy();
    tracker.track("sources", source!.ID);

    await pickInlineCreateOption(page, "Customer", "New Customer", {root: form});
    await createInModal(page, "Customer", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} DashCust-${token}`);
        await modal.getByLabel("Street", {exact: true}).fill("2 Dashboard Dr");
        await modal.getByLabel("City", {exact: true}).fill("DashTown");
        await modal.getByLabel("ZIP", {exact: true}).fill("99999");
    });
    const customer = await prisma.customers.findFirst({where: {Name: {contains: `DashCust-${token}`}}});
    expect(customer).toBeTruthy();
    tracker.track("customers", customer!.ID);

    await pickInlineCreateOption(page, "Load Type", "New Load Type", {root: form});
    await createInModal(page, "Load Type", async (modal) => {
        await modal.getByRole("textbox", {name: "Description"}).fill(`${TEST_NAME_PREFIX} DashType-${token}`);
    });
    const loadType = await prisma.loadTypes.findFirst({
        where: {Description: {contains: `DashType-${token}`}},
    });
    expect(loadType).toBeTruthy();
    expect(loadType!.ID).toBeGreaterThanOrEqual(NEW_LOAD_TYPE_ID_THRESHOLD);
    tracker.track("loadTypes", loadType!.ID);

    await pickInlineCreateOption(page, "Delivery Location", "New Delivery Location", {root: form});
    await createInModal(page, "Delivery Location", async (modal) => {
        await modal.getByRole("textbox", {name: "Description"}).fill(`${TEST_NAME_PREFIX} DashDL-${token}`);
    });
    const deliveryLocation = await prisma.deliveryLocations.findFirst({
        where: {Description: {contains: `DashDL-${token}`}},
    });
    expect(deliveryLocation).toBeTruthy();
    tracker.track("deliveryLocations", deliveryLocation!.ID);

    await pickInlineCreateOption(page, "Truck", "New Truck", {root: form});
    await createInModal(page, "Truck", async (modal) => {
        await modal.getByLabel("Name", {exact: true}).fill(`${TEST_NAME_PREFIX} DashTruck-${token}`);
    });
    const truck = await prisma.trucks.findFirst({where: {Name: {contains: `DashTruck-${token}`}}});
    expect(truck).toBeTruthy();
    tracker.track("trucks", truck!.ID);

    const ticket = String(nextTestTicket(96));
    await form.getByLabel(/Ticket Number/i).fill(ticket);
    await form.getByLabel(/^Weight$/i).fill("22");
    await form.getByLabel("Delivered On").fill(todayForDatePicker());
    await page.getByTestId("form-submit").click();

    await expect
        .poll(async () => {
            const row = await prisma.loads.findFirst({where: {TicketNumber: Number(ticket)}});
            return row?.ID ?? 0;
        }, {timeout: 30000})
        .toBeGreaterThan(0);

    const load = await prisma.loads.findFirst({where: {TicketNumber: Number(ticket)}});
    expect(load).toBeTruthy();
    tracker.track("loads", load!.ID);
    expect(load!.CustomerID).toBe(customer!.ID);
    expect(load!.DriverID).toBe(driver!.ID);
    expect(load!.TruckID).toBe(truck!.ID);
    expect(load!.LoadTypeID).toBe(loadType!.ID);
    expect(load!.SourceID).toBe(source!.ID);
    expect(load!.DeliveryLocationID).toBe(deliveryLocation!.ID);
});
