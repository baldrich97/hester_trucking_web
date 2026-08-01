/**
 * Sweeps orphaned test rows from the dev DB (leftovers from crashed/killed test runs
 * whose afterAll cleanup never ran). Everything deleted here is unambiguously
 * test data: [TEST] name prefixes, 2099-W* weeks, 999xxx tickets, 999800+ invoice numbers.
 *
 * Usage: npm run test:cleanup
 */
import {PrismaClient} from "@prisma/client";
import {config} from "dotenv";
config();

const p = new PrismaClient();
const totals = {};
const add = (key, n) => {
    totals[key] = (totals[key] ?? 0) + n;
};

// --- Collect [TEST] entity IDs -------------------------------------------------
const custIds = (
    await p.customers.findMany({where: {Name: {startsWith: "[TEST]"}}, select: {ID: true}})
).map((c) => c.ID);
const sourceIds = (
    await p.sources.findMany({where: {Name: {startsWith: "[TEST]"}}, select: {ID: true}})
).map((s) => s.ID);
const ltIds = (
    await p.loadTypes.findMany({where: {Description: {startsWith: "[TEST]"}}, select: {ID: true}})
).map((l) => l.ID);
const driverIds = (
    await p.drivers.findMany({where: {FirstName: "[TEST]"}, select: {ID: true}})
).map((d) => d.ID);
const formIds = (
    await p.forms.findMany({where: {Name: {startsWith: "[TEST]"}}, select: {ID: true}})
).map((f) => f.ID);

// --- Orphaned job graphs referencing test entities or test weeks ---------------
const orphanJobs = await p.jobs.findMany({
    where: {
        OR: [
            {CustomerID: {in: custIds}},
            {SourceID: {in: sourceIds}},
            {LoadTypeID: {in: ltIds}},
            {DriverID: {in: driverIds}},
            {Weeklies: {Week: {startsWith: "2099-W"}}},
        ],
    },
    select: {ID: true, DailyID: true},
});
const jobIds = orphanJobs.map((j) => j.ID);
const dailyIds = [...new Set(orphanJobs.map((j) => j.DailyID))];

add(
    "loads",
    (
        await p.loads.deleteMany({
            where: {
                OR: [
                    {JobID: {in: jobIds}},
                    {Week: {startsWith: "2099-W"}},
                    {TicketNumber: {gte: 999001, lte: 999999}},
                    {CustomerID: {in: custIds}},
                    {LoadTypeID: {in: ltIds}},
                    {SourceID: {in: sourceIds}},
                    {DriverID: {in: driverIds}},
                ],
            },
        })
    ).count,
);
add("jobs", (await p.jobs.deleteMany({where: {ID: {in: jobIds}}})).count);
add(
    "weeklies",
    (
        await p.weeklies.deleteMany({
            where: {
                OR: [
                    {Week: {startsWith: "2099-W"}},
                    {CustomerID: {in: custIds}},
                    {LoadTypeID: {in: ltIds}},
                    {SourceID: {in: sourceIds}},
                ],
            },
        })
    ).count,
);
add(
    "dailies",
    (
        await p.dailies.deleteMany({
            where: {OR: [{Week: {startsWith: "2099-W"}}, {DriverID: {in: driverIds}}]},
        })
    ).count,
);
// Dailies that belonged to orphan jobs but aren't test-week/driver rows: only if now empty.
for (const id of dailyIds) {
    const remaining = await p.jobs.count({where: {DailyID: id}});
    if (remaining === 0) {
        const deleted = await p.dailies.delete({where: {ID: id}}).catch(() => null);
        if (deleted) add("dailies", 1);
    }
}

// --- Invoices, paystubs, compliance, junction rows ------------------------------
add(
    "invoices",
    (
        await p.invoices.deleteMany({
            where: {OR: [{CustomerID: {in: custIds}}, {Number: {gte: 999800, lte: 999999}}]},
        })
    ).count,
);
add("payStubs", (await p.payStubs.deleteMany({where: {DriverID: {in: driverIds}}})).count);
add(
    "driverForms",
    (
        await p.driverForms.deleteMany({
            where: {OR: [{Driver: {in: driverIds}}, {Form: {in: formIds}}]},
        })
    ).count,
);
add(
    "trucksDriven",
    (await p.trucksDriven.deleteMany({where: {DriverID: {in: driverIds}}})).count,
);
add(
    "customerLoadTypes",
    (
        await p.customerLoadTypes.deleteMany({
            where: {OR: [{CustomerID: {in: custIds}}, {LoadTypeID: {in: ltIds}}]},
        })
    ).count,
);
add(
    "customerDeliveryLocations",
    (await p.customerDeliveryLocations.deleteMany({where: {CustomerID: {in: custIds}}})).count,
);
add(
    "sourceLoadTypes",
    (
        await p.sourceLoadTypes.deleteMany({
            where: {OR: [{SourceID: {in: sourceIds}}, {LoadTypeID: {in: ltIds}}]},
        })
    ).count,
);

// --- The [TEST] entities themselves ---------------------------------------------
add("formOptions", (await p.formOptions.deleteMany({where: {Form: {in: formIds}}})).count);
add("forms", (await p.forms.deleteMany({where: {ID: {in: formIds}}})).count);
add("customers", (await p.customers.deleteMany({where: {ID: {in: custIds}}})).count);
add("sources", (await p.sources.deleteMany({where: {ID: {in: sourceIds}}})).count);
add("loadTypes", (await p.loadTypes.deleteMany({where: {ID: {in: ltIds}}})).count);
add("drivers", (await p.drivers.deleteMany({where: {ID: {in: driverIds}}})).count);
add(
    "trucks",
    (await p.trucks.deleteMany({where: {Name: {startsWith: "[TEST]"}}})).count,
);

console.log("deleted:", totals);

const remaining = {
    customers: await p.customers.count({where: {Name: {startsWith: "[TEST]"}}}),
    drivers: await p.drivers.count({where: {FirstName: "[TEST]"}}),
    sources: await p.sources.count({where: {Name: {startsWith: "[TEST]"}}}),
    trucks: await p.trucks.count({where: {Name: {startsWith: "[TEST]"}}}),
    loadTypes: await p.loadTypes.count({where: {Description: {startsWith: "[TEST]"}}}),
    forms: await p.forms.count({where: {Name: {startsWith: "[TEST]"}}}),
    weeklies2099: await p.weeklies.count({where: {Week: {startsWith: "2099-W"}}}),
    dailies2099: await p.dailies.count({where: {Week: {startsWith: "2099-W"}}}),
    loads999: await p.loads.count({where: {TicketNumber: {gte: 999001, lte: 999999}}}),
    invoices9998: await p.invoices.count({where: {Number: {gte: 999800, lte: 999999}}}),
};
console.log("remaining:", remaining);
await p.$disconnect();
