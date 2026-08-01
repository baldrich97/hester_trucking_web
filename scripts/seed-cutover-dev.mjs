/**
 * Seeds the dev DB with the post-cutover catalog so the new-era load form has
 * real data to work with locally:
 *   - Sources from prisma/migration-data/client-review/seed_sources.csv (KEEP rows)
 *   - Clean LoadTypes (ID >= 10000) from seed_loadtypes_with_services.csv (KEEP rows)
 *   - Bumps LoadTypes AUTO_INCREMENT to 10000 so future inserts land in the new range
 *
 * Idempotent: existing rows (matched by exact Name / Description) are skipped.
 *
 * Usage:
 *   node scripts/seed-cutover-dev.mjs             # seed everything
 *   node scripts/seed-cutover-dev.mjs --limit 10  # first 10 of each (quick smoke)
 *   node scripts/seed-cutover-dev.mjs --dry-run   # print what would be created
 */
import {PrismaClient} from "@prisma/client";
import {readFileSync} from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {config} from "dotenv";
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../prisma/migration-data/client-review");
const NEW_LOAD_TYPE_ID_THRESHOLD = 10000;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;

// --- Safety: never run against anything that smells like production -------------
const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl) {
    console.error("DATABASE_URL is not set (.env). Aborting.");
    process.exit(1);
}
for (const bad of ["prod", "production", "live"]) {
    if (dbUrl.toLowerCase().includes(bad)) {
        console.error(`DATABASE_URL contains "${bad}" — refusing to seed. Aborting.`);
        process.exit(1);
    }
}

// --- Minimal CSV parser (handles quoted fields, embedded commas, "" escapes) ----
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            row.push(field);
            field = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            row.push(field);
            field = "";
            if (row.some((c) => c.length > 0)) rows.push(row);
            row = [];
        } else {
            field += ch;
        }
    }
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
    return rows;
}

function readCsvRecords(fileName) {
    const filePath = path.join(DATA_DIR, fileName);
    const rows = parseCsv(readFileSync(filePath, "utf8"));
    const header = rows.shift();
    return rows.map((cells) =>
        Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? "").trim()])),
    );
}

const prisma = new PrismaClient();
const summary = {sourcesCreated: 0, sourcesSkipped: 0, loadTypesCreated: 0, loadTypesSkipped: 0};

// --- Sources ---------------------------------------------------------------------
const sourceRecords = readCsvRecords("seed_sources.csv")
    .filter((r) => r.ClientAction?.toUpperCase() === "KEEP" && r.Name)
    .slice(0, limit);

for (const record of sourceRecords) {
    const existing = await prisma.sources.findFirst({where: {Name: record.Name}});
    if (existing) {
        summary.sourcesSkipped++;
        continue;
    }
    if (dryRun) {
        console.log(`[dry-run] source: ${record.Name} (${record.ShortName})`);
    } else {
        await prisma.sources.create({
            data: {Name: record.Name, ShortName: record.ShortName || record.Name},
        });
    }
    summary.sourcesCreated++;
}

// --- Clean LoadTypes (ID >= 10000) -------------------------------------------------
const loadTypeRecords = readCsvRecords("seed_loadtypes_with_services.csv")
    .filter((r) => r.ClientAction?.toUpperCase() === "KEEP" && r.ProposedDescription)
    .slice(0, limit);

const maxRow = await prisma.loadTypes.aggregate({_max: {ID: true}});
let nextId = Math.max(NEW_LOAD_TYPE_ID_THRESHOLD, (maxRow._max.ID ?? 0) + 1);

for (const record of loadTypeRecords) {
    const description = record.ProposedDescription;
    const existing = await prisma.loadTypes.findFirst({
        where: {
            Description: description,
            ID: {gte: NEW_LOAD_TYPE_ID_THRESHOLD},
            OR: [{Deleted: false}, {Deleted: null}],
        },
    });
    if (existing) {
        summary.loadTypesSkipped++;
        continue;
    }
    if (dryRun) {
        console.log(`[dry-run] loadtype ${nextId}: ${description}`);
    } else {
        await prisma.loadTypes.create({
            data: {ID: nextId, Description: description, Deleted: false},
        });
    }
    nextId++;
    summary.loadTypesCreated++;
}

// --- AUTO_INCREMENT so ad-hoc inserts also land >= 10000 --------------------------
if (!dryRun) {
    const target = Math.max(NEW_LOAD_TYPE_ID_THRESHOLD, nextId);
    await prisma.$executeRawUnsafe(`ALTER TABLE LoadTypes AUTO_INCREMENT = ${target}`);
    console.log(`LoadTypes AUTO_INCREMENT set to ${target}`);
}

console.log(dryRun ? "dry-run summary:" : "seeded:", summary);
await prisma.$disconnect();
