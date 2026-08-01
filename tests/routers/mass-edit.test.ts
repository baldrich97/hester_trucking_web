import {describe, expect, it, vi, beforeEach, afterEach} from "vitest";
import type {Session} from "next-auth";
import {createPrismaMock} from "../helpers/prismaMock";
import {configurePrismaMockDefaults} from "../helpers/configurePrismaMock";
import {callTrpcMutation, callTrpcQuery, createTestContext} from "../helpers/trpcCaller";

const fakeSession = {user: {name: "test-admin"}, expires: "2099-01-01"} as Session;

vi.mock("../../src/server/loadSheetSync", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/server/loadSheetSync")>();
    return {
        ...actual,
        assertLoadsNotPaidOut: vi.fn().mockResolvedValue(undefined),
        assertLoadsNotInvoiced: vi.fn().mockResolvedValue(undefined),
        syncOpenSheetAmounts: vi.fn().mockResolvedValue(undefined),
    };
});

vi.mock("../../src/server/loadRematch", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/server/loadRematch")>();
    return {
        ...actual,
        rematchLoadToJob: vi.fn().mockResolvedValue({JobID: 99, SourceID: null}),
    };
});

vi.mock("../../src/server/loadRelationalSync", () => ({
    syncLoadRelationalRecords: vi.fn().mockResolvedValue(undefined),
}));

import {assertLoadsNotInvoiced, assertLoadsNotPaidOut, syncOpenSheetAmounts} from "../../src/server/loadSheetSync";
import {syncLoadRelationalRecords} from "../../src/server/loadRelationalSync";

describe("mass-edit router contracts", () => {
    const env = process.env;

    beforeEach(() => {
        process.env.SOURCES_CUTOVER_FORCE = "true";
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = {...env};
    });

    it("ME-22: loads.getByJobId returns unpaginated list", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        const rows = [{ID: 1}, {ID: 2}, {ID: 3}];
        prisma.loads.findMany.mockResolvedValue(rows);
        const ctx = await createTestContext(prisma, {session: fakeSession});

        const result = await callTrpcQuery("loads.getByJobId", {jobId: 5}, ctx);

        expect(result).toEqual(rows);
        expect(prisma.loads.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({JobID: 5}),
                orderBy: {ID: "desc"},
            }),
        );
        const call = prisma.loads.findMany.mock.calls[0]![0] as {take?: number};
        expect(call.take).toBeUndefined();
    });

    it("ME-21 / PO-R1: post_mass_edit calls guards and omits TruckID/StartDate from massData", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        prisma.loads.findMany.mockResolvedValue([
            {
                ID: 10,
                JobID: 1,
                DriverID: 2,
                TruckID: 3,
                StartDate: new Date("2026-01-01"),
                CustomerID: 4,
                LoadTypeID: 5,
                DeliveryLocationID: 6,
            },
            {
                ID: 11,
                JobID: 1,
                DriverID: 2,
                TruckID: 3,
                StartDate: new Date("2026-01-02"),
                CustomerID: 4,
                LoadTypeID: 5,
                DeliveryLocationID: 6,
            },
        ]);
        prisma.loads.updateMany.mockResolvedValue({count: 2});
        const ctx = await createTestContext(prisma, {session: fakeSession});

        await callTrpcMutation(
            "loads.post_mass_edit",
            {
                selectedLoads: [10, 11],
                data: {
                    TicketNumber: 999001,
                    CustomerID: 1,
                    DriverID: 2,
                    TruckID: 3,
                    LoadTypeID: 4,
                    DeliveryLocationID: 5,
                    StartDate: new Date(),
                    Week: "2099-W01",
                    MaterialRate: 6,
                    TruckRate: 11,
                    DriverRate: 9,
                    TotalRate: 17,
                    Weight: 20,
                    TotalAmount: 340,
                    Created: new Date(),
                },
            },
            ctx,
        );

        expect(assertLoadsNotPaidOut).toHaveBeenCalledWith(ctx, [10, 11]);
        expect(assertLoadsNotInvoiced).toHaveBeenCalledWith(ctx, [10, 11]);
        expect(syncOpenSheetAmounts).toHaveBeenCalled();
        expect(syncLoadRelationalRecords).toHaveBeenCalledTimes(2);
        const updateData = prisma.loads.updateMany.mock.calls[0]![0].data as Record<string, unknown>;
        expect(updateData.TruckID).toBeUndefined();
        expect(updateData.StartDate).toBeUndefined();
        expect(updateData.CustomerID).toBe(1);
        expect(updateData.TotalRate).toBe(17);
        expect(updateData.JobID).toBe(99);
    });

    it("ME-23: post_mass_edit rejects empty selectedLoads", async () => {
        const prisma = createPrismaMock();
        configurePrismaMockDefaults(prisma);
        const ctx = await createTestContext(prisma, {session: fakeSession});

        await expect(
            callTrpcMutation(
                "loads.post_mass_edit",
                {
                    selectedLoads: [],
                    data: {
                        TicketNumber: 999001,
                        CustomerID: 1,
                        DriverID: 2,
                        LoadTypeID: 4,
                        DeliveryLocationID: 5,
                        StartDate: new Date(),
                        Week: "2099-W01",
                        MaterialRate: 6,
                        TruckRate: 11,
                        DriverRate: 9,
                        TotalRate: 17,
                        Weight: 20,
                        TotalAmount: 340,
                        Created: new Date(),
                    },
                },
                ctx,
            ),
        ).rejects.toThrow(/no loads selected/i);
    });
});
