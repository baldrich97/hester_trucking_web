import {beforeAll} from "vitest";
import {confirmDatabaseUrlForTests} from "./helpers/dbGuard";

let dbConfirmed = false;

beforeAll(async () => {
    if (!dbConfirmed) {
        await confirmDatabaseUrlForTests();
        dbConfirmed = true;
    }
}, 120000);
