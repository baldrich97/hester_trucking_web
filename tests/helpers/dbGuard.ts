import {config as loadDotenv} from "dotenv";
import {confirm, input} from "@inquirer/prompts";

/** Hosts allowed for test:db and test:e2e (dev only). */
const ALLOWED_HOSTS = new Set([
    "srv768.hstgr.io",
    "localhost",
    "127.0.0.1",
]);

/** Substrings that block a URL even if allowlisted. */
const DENY_HOST_PATTERNS = [/prod/i, /production/i, /live/i];

export type ParsedDbUrl = {
    host: string;
    database: string;
    masked: string;
};

export function loadTestEnv(): void {
    loadDotenv({path: ".env", override: false});
}

export function parseDatabaseUrl(raw: string | undefined): ParsedDbUrl {
    if (!raw || raw.trim().length === 0) {
        throw new Error("DATABASE_URL is not set. Tests that touch the database require .env with your dev URL.");
    }
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new Error("DATABASE_URL is not a valid URL.");
    }
    const host = url.hostname;
    const database = url.pathname.replace(/^\//, "") || "(unknown)";
    const masked = `${url.protocol}//${url.username || "user"}:***@${host}${url.port ? `:${url.port}` : ""}/${database}`;
    return {host, database, masked};
}

export function assertDevDatabaseAllowed(raw: string | undefined): ParsedDbUrl {
    const parsed = parseDatabaseUrl(raw);
    for (const pattern of DENY_HOST_PATTERNS) {
        if (pattern.test(parsed.host) || pattern.test(parsed.database)) {
            throw new Error(
                `Refusing to run DB tests: DATABASE_URL host/database matches blocked pattern (${pattern}).`,
            );
        }
    }
    if (!ALLOWED_HOSTS.has(parsed.host)) {
        throw new Error(
            `Refusing to run DB tests: host "${parsed.host}" is not on the dev allowlist. ` +
                `Allowed: ${[...ALLOWED_HOSTS].join(", ")}`,
        );
    }
    return parsed;
}

/**
 * Confirms DATABASE_URL before any write test. Skip prompt when TEST_DB_CONFIRMED=yes.
 */
export async function confirmDatabaseUrlForTests(): Promise<ParsedDbUrl> {
    loadTestEnv();
    const parsed = assertDevDatabaseAllowed(process.env.DATABASE_URL);

    if (process.env.TEST_DB_CONFIRMED === "yes") {
        return parsed;
    }

    console.log("\n--- Database test guard ---");
    console.log(`Target: ${parsed.masked}`);
    console.log("This suite will CREATE / UPDATE / DELETE rows on the dev database.\n");

    const proceed = await confirm({
        message: `Continue with dev database ${parsed.host}/${parsed.database}?`,
        default: false,
    });
    if (!proceed) {
        throw new Error("Database tests cancelled by user.");
    }

    const typed = await input({
        message: 'Type YES to confirm (extra safety)',
        default: "",
    });
    if (typed.trim().toUpperCase() !== "YES") {
        throw new Error('Database tests cancelled: expected "YES".');
    }

    return parsed;
}
