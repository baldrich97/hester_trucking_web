import {PrismaClient} from "@prisma/client";
import {loadTestEnv} from "../helpers/dbGuard";
import {TEST_TICKET_MAX, TEST_TICKET_MIN} from "../helpers/testData";

/**
 * Deletes rows created by E2E submit flows.
 * Only touches the reserved test ticket range (999001-999999); jobs/weeklies
 * reached via legacy prefill belong to pre-existing data and are left alone.
 */
export default async function globalTeardown() {
    loadTestEnv();
    const prisma = new PrismaClient();
    try {
        const deleted = await prisma.loads.deleteMany({
            where: {TicketNumber: {gte: TEST_TICKET_MIN, lte: TEST_TICKET_MAX}},
        });
        if (deleted.count > 0) {
            console.log(`[e2e teardown] removed ${deleted.count} test load(s)`);
        }
    } catch (error) {
        console.warn("[e2e teardown] cleanup failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}
