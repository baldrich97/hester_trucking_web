import {expect, test} from "@playwright/test";
import {PrismaClient} from "@prisma/client";
import {TestRunTracker} from "../helpers/testRunTracker";
import {
    createSeedPrisma,
    seedMassEditClosedJob,
    seedMassEditJob,
    seedMassEditPaidJob,
    type MassEditClosedJobSeed,
    type MassEditJobSeed,
    type MassEditPaidJobSeed,
} from "./helpers/dbSeed";

const prisma = createSeedPrisma();
const tracker = new TestRunTracker();
let jobSeed: MassEditJobSeed;
let paidSeed: MassEditPaidJobSeed;
let closedSeed: MassEditClosedJobSeed;

test.describe.configure({mode: "serial"});

test.beforeAll(async () => {
    const token = String(Date.now() % 100000);
    jobSeed = await seedMassEditJob(prisma, tracker, token, 4);
    paidSeed = await seedMassEditPaidJob(prisma, tracker);
    closedSeed = await seedMassEditClosedJob(prisma, tracker);
});

test.afterAll(async () => {
    await tracker.cleanup(prisma);
    await prisma.$disconnect();
});

async function openJobFromTicket(page: import("@playwright/test").Page, ticket: number) {
    await page.goto("/loads/massedit");
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
    await page.getByRole("button", {name: /open filter modal/i}).click();
    await expect(page.getByText(/Specify Search Terms/i)).toBeVisible();
    await page.getByLabel(/Ticket Number/i).fill(String(ticket));
    await page.getByRole("button", {name: "Search"}).click();
    const row = page.locator("tbody tr").filter({hasText: String(ticket)}).first();
    await expect(row).toBeVisible({timeout: 15000});
    await row.locator("button").last().click();
    await expect(page.getByTestId("mass-edit-loads-table")).toBeVisible({timeout: 15000});
    await expect(page.locator('[data-testid^="mass-edit-load-row-"]').first()).toBeVisible({
        timeout: 15000,
    });
}

async function setTruckRate(page: import("@playwright/test").Page, rate: string) {
    const truckRate = page.getByLabel("Truck Rate", {exact: true});
    await expect(truckRate).toBeVisible({timeout: 10000});
    await truckRate.clear();
    await truckRate.fill(rate);
    await truckRate.blur();
}

async function submitMassEdit(page: import("@playwright/test").Page) {
    await page.getByTestId("form-submit").click();
    await page.getByRole("button", {name: "Do Mass Edit"}).click({timeout: 10000});
    await expect(page.getByText(/Successfully Submitted/i)).toBeVisible({timeout: 30000});
}

test("ME-E1: navigate to mass edit and find load via ticket filter", async ({page}) => {
    await openJobFromTicket(page, jobSeed.anchorTicket);
});

test("ME-E2: red arrow shows all job tickets matching DB count", async ({page}) => {
    await openJobFromTicket(page, jobSeed.anchorTicket);
    await expect(page.getByTestId("mass-edit-job-header")).toContainText(
        `Job #${jobSeed.jobId} — ${jobSeed.loads.length} loads selected`,
    );
    for (const load of jobSeed.loads) {
        await expect(page.getByText(String(load.ticket))).toBeVisible();
    }
});

test("ME-E3: table scroll container present for many rows", async ({page}) => {
    await openJobFromTicket(page, jobSeed.anchorTicket);
    await expect(page.getByTestId("mass-edit-table-scroll")).toBeVisible();
});

test("ME-E4: expand row shows truck and rates", async ({page}) => {
    await openJobFromTicket(page, jobSeed.anchorTicket);
    const first = jobSeed.loads[0]!;
    await page.getByTestId(`mass-edit-expand-${first.id}`).click();
    const detail = page.getByTestId(`mass-edit-detail-${first.id}`);
    await expect(detail).toBeVisible();
    await expect(detail.getByText(/Truck/i)).toBeVisible();
    await expect(detail.getByText(/Rates/i)).toBeVisible();
});

test("ME-E5: remove row decrements selected count", async ({page}) => {
    await openJobFromTicket(page, jobSeed.anchorTicket);
    const removeId = jobSeed.loads[jobSeed.loads.length - 1]!.id;
    await page.getByTestId(`mass-edit-remove-${removeId}`).click();
    await expect(page.getByTestId("mass-edit-job-header")).toContainText(
        `${jobSeed.loads.length - 1} load`,
    );
});

test("ME-E6: confirm dialog shows tickets after form change", async ({page}) => {
    await openJobFromTicket(page, jobSeed.anchorTicket);
    await setTruckRate(page, "12.5");
    await page.getByTestId("form-submit").click();
    const dialog = page.locator(".react-confirm-alert");
    await expect(dialog).toBeVisible({timeout: 10000});
    await expect(dialog).toContainText(String(jobSeed.anchorTicket));
    await expect(dialog.getByText(/truck stay unchanged/i)).toBeVisible();
});

test("ME-E7 / ME-E8: submit succeeds and DB preserves truck/date on remaining loads", async ({page}) => {
    const fresh = await seedMassEditJob(prisma, tracker, `submit-${Date.now() % 10000}`, 2);
    await openJobFromTicket(page, fresh.anchorTicket);
    const before = await prisma.loads.findMany({where: {JobID: fresh.jobId}});

    await setTruckRate(page, "12.5");
    await submitMassEdit(page);

    const after = await prisma.loads.findMany({where: {ID: {in: before.map((l) => l.ID)}}});
    for (const row of after) {
        const prev = before.find((b) => b.ID === row.ID);
        expect(row.TruckID).toBe(prev?.TruckID);
        expect(row.StartDate?.toISOString()).toBe(prev?.StartDate?.toISOString());
    }
    expect(after.every((l) => Number(l.TruckRate) === 12.5)).toBe(true);
});

test("ME-E9: single load edit smoke via loads page is out of scope here; mass edit table loads", async ({page}) => {
    await page.goto("/loads/massedit");
    await expect(page.locator("main")).toBeVisible({timeout: 15000});
});

test("PO-E1: mass edit on paid job shows error", async ({page}) => {
    await openJobFromTicket(page, paidSeed.ticket);
    const before = await prisma.loads.findUnique({where: {ID: paidSeed.loadId}});
    await setTruckRate(page, "13");
    await page.getByTestId("form-submit").click();
    await page.getByRole("button", {name: "Do Mass Edit"}).click({timeout: 10000});
    await expect(page.getByText(/paid out/i).first()).toBeVisible({timeout: 15000});
    const after = await prisma.loads.findUnique({where: {ID: paidSeed.loadId}});
    expect(after?.TruckRate).toBe(before?.TruckRate);
});

test("JC-E1: mass edit on closed job succeeds; revenues unchanged", async ({page}) => {
    await openJobFromTicket(page, closedSeed.ticket);
    await setTruckRate(page, "12");
    await submitMassEdit(page);

    const job = await prisma.jobs.findUnique({where: {ID: closedSeed.jobId}});
    expect(job?.TruckingRevenue).toBe(closedSeed.truckingRevenue);
    expect(job?.CompanyRevenue).toBe(closedSeed.companyRevenue);
});
