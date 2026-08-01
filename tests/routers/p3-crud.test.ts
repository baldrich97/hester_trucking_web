import {describe, expect, it} from "vitest";
import {createPrismaMock} from "../helpers/prismaMock";
import {callTrpcQuery, createTestContext} from "../helpers/trpcCaller";

describe("P3 CRUD routers", () => {
    it("states.getAll", async () => {
        const prisma = createPrismaMock();
        prisma.states.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("states.getAll", undefined, ctx);
        expect(prisma.states.findMany).toHaveBeenCalled();
    });

    it("config.sourcesCutover returns threshold", async () => {
        const prisma = createPrismaMock();
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{newLoadTypeIdThreshold: number}>(
            "config.sourcesCutover",
            undefined,
            ctx,
        );
        expect(result.newLoadTypeIdThreshold).toBe(10000);
    });

    it("sources.getAll when cutover active", async () => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        const prisma = createPrismaMock();
        prisma.sources.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("sources.getAll", undefined, ctx);
        expect(prisma.sources.findMany).toHaveBeenCalled();
    });

    it("loads.getAllPage", async () => {
        const prisma = createPrismaMock();
        prisma.loads.findMany.mockResolvedValue([] as never);
        prisma.loads.count.mockResolvedValue(0 as never);
        const ctx = await createTestContext(prisma);
        const result = await callTrpcQuery<{rows: unknown[]; count: number}>(
            "loads.getAllPage",
            {page: 0},
            ctx,
        );
        expect(result.count).toBe(0);
    });

    it("invoices.getAll", async () => {
        const prisma = createPrismaMock();
        prisma.invoices.findMany.mockResolvedValue([] as never);
        const ctx = await createTestContext(prisma);
        await callTrpcQuery("invoices.getAll", {page: 0}, ctx);
        expect(prisma.invoices.findMany).toHaveBeenCalled();
    });
});
