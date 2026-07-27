import {confirmDatabaseUrlForTests, loadTestEnv} from "../helpers/dbGuard";

export default async function globalSetup() {
    loadTestEnv();
    if (process.env.PLAYWRIGHT_SKIP_DB_CONFIRM === "yes") {
        return;
    }
    await confirmDatabaseUrlForTests();
}
