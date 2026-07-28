import {afterEach, describe, expect, it, vi} from "vitest";
import {TRPCError} from "@trpc/server";
import {buildLoadFilters} from "../../src/server/loadListFilters";
import {
    assertLoadsNotPaidOut,
    loadTotalAmount,
    roundMoney,
    syncOpenSheetAmounts,
} from "../../src/server/loadSheetSync";

describe("loadSheetSync", () => {
    describe("loadTotalAmount / roundMoney", () => {
        it("OS-U1: recalcs TotalAmount from weight and rate", () => {
            expect(loadTotalAmount(20, null, 17)).toBe(340);
            expect(loadTotalAmount(null, 5, 10)).toBe(50);
            expect(roundMoney(10.005)).toBe(10.01);
        });
    });

    describe("buildLoadFilters rate checks", () => {
        it("ME-16 / OS-U: MaterialRate 0 still applies filter with != null fix", () => {
            const filters = buildLoadFilters({
                chosenLoad: {MaterialRate: 0, TotalRate: 17},
            });
            expect(filters.MaterialRate).toEqual({gte: -0.001, lte: 0.001});
            expect(filters.TotalRate).toEqual({gte: 16.999, lte: 17.001});
        });

        it("all four rates at 0 still filter correctly", () => {
            const filters = buildLoadFilters({
                chosenLoad: {
                    MaterialRate: 0,
                    TruckRate: 0,
                    DriverRate: 0,
                    TotalRate: 0,
                },
            });
            expect(filters.MaterialRate).toBeDefined();
            expect(filters.TruckRate).toBeDefined();
            expect(filters.DriverRate).toBeDefined();
            expect(filters.TotalRate).toBeDefined();
        });
    });

    describe("assertLoadsNotPaidOut", () => {
        it("PO-U1: allows when all jobs unpaid", async () => {
            const ctx = {
                prisma: {
                    loads: {
                        findMany: vi.fn().mockResolvedValue([
                            {ID: 1, Jobs: {PaidOut: false}},
                            {ID: 2, Jobs: {PaidOut: false}},
                        ]),
                    },
                },
            };
            await expect(assertLoadsNotPaidOut(ctx, [1, 2])).resolves.toBeUndefined();
        });

        it("PO-U2: rejects when any job PaidOut", async () => {
            const ctx = {
                prisma: {
                    loads: {
                        findMany: vi.fn().mockResolvedValue([
                            {ID: 1, Jobs: {PaidOut: false}},
                            {ID: 2, Jobs: {PaidOut: true}},
                        ]),
                    },
                },
            };
            await expect(assertLoadsNotPaidOut(ctx, [1, 2])).rejects.toThrow(TRPCError);
            await expect(assertLoadsNotPaidOut(ctx, [1, 2])).rejects.toThrow(/paid out/i);
        });

        it("PO-U3: checks all mass-edit IDs", async () => {
            const findMany = vi.fn().mockResolvedValue([{ID: 5, Jobs: {PaidOut: true}}]);
            const ctx = {prisma: {loads: {findMany}}};
            await expect(assertLoadsNotPaidOut(ctx, [3, 4, 5])).rejects.toThrow(TRPCError);
            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: {ID: {in: [3, 4, 5]}}}),
            );
        });
    });

    describe("syncOpenSheetAmounts", () => {
        const loadUpdate = vi.fn().mockResolvedValue({});
        const weeklyUpdate = vi.fn().mockResolvedValue({});
        const weekliesFindUnique = vi.fn();
        const jobsFindMany = vi.fn();
        const loadsFindMany = vi.fn();

        function makeCtx() {
            return {
                prisma: {
                    loads: {
                        findMany: loadsFindMany,
                        update: loadUpdate,
                    },
                    jobs: {findMany: jobsFindMany},
                    weeklies: {
                        findUnique: weekliesFindUnique,
                        update: weeklyUpdate,
                    },
                },
            };
        }

        afterEach(() => {
            vi.clearAllMocks();
        });

        it("JC-U1: never writes job revenues (no jobs.update call)", async () => {
            loadsFindMany
                .mockResolvedValueOnce([{ID: 1, Weight: 10, Hours: null, TotalRate: 5, JobID: 9}])
                .mockResolvedValueOnce([{JobID: 9}]);
            jobsFindMany.mockResolvedValue([{WeeklyID: 3}]);
            weekliesFindUnique.mockResolvedValue({
                ID: 3,
                Revenue: 500,
                InvoiceID: null,
            });

            const ctx = makeCtx();
            await syncOpenSheetAmounts(ctx, {loadIds: [1]});

            expect(loadUpdate).toHaveBeenCalled();
            expect(weeklyUpdate).not.toHaveBeenCalled();
            expect(ctx.prisma.jobs.update).toBeUndefined();
        });

        it("JC-U2: still recalcs load TotalAmount when parent job closed", async () => {
            loadsFindMany
                .mockResolvedValueOnce([{ID: 1, Weight: 20, Hours: null, TotalRate: 17, JobID: 9}])
                .mockResolvedValueOnce([{JobID: 9}]);
            jobsFindMany.mockResolvedValue([{WeeklyID: 3}]);
            weekliesFindUnique.mockResolvedValue({
                ID: 3,
                Revenue: 999,
                InvoiceID: null,
            });

            const ctx = makeCtx();
            await syncOpenSheetAmounts(ctx, {loadIds: [1]});

            expect(loadUpdate).toHaveBeenCalledWith({
                where: {ID: 1},
                data: {TotalAmount: 340},
            });
        });

        it("WC-U1: never writes weekly Revenue when non-null", async () => {
            loadsFindMany.mockResolvedValue([]);
            jobsFindMany.mockResolvedValue([{WeeklyID: 3}]);
            weekliesFindUnique.mockResolvedValue({
                ID: 3,
                Revenue: 100,
                InvoiceID: null,
            });

            const ctx = makeCtx();
            await syncOpenSheetAmounts(ctx, {jobIds: [9]});

            expect(weeklyUpdate).not.toHaveBeenCalled();
        });

        it("WI-U1: skips TotalWeight when InvoiceID set", async () => {
            loadsFindMany.mockResolvedValue([]);
            jobsFindMany.mockResolvedValue([{WeeklyID: 3}]);
            weekliesFindUnique.mockResolvedValue({
                ID: 3,
                Revenue: null,
                InvoiceID: 42,
            });

            const ctx = makeCtx();
            await syncOpenSheetAmounts(ctx, {jobIds: [9]});

            expect(weeklyUpdate).not.toHaveBeenCalled();
        });

        it("OS-U2: updates TotalWeight on open weekly", async () => {
            loadsFindMany.mockResolvedValue([]);
            jobsFindMany.mockResolvedValue([{WeeklyID: 3}]);
            weekliesFindUnique.mockResolvedValue({
                ID: 3,
                Revenue: null,
                InvoiceID: null,
            });
            jobsFindMany.mockResolvedValueOnce([{WeeklyID: 3}]).mockResolvedValueOnce([
                {
                    WeeklyID: 3,
                    Loads: [{Weight: 10, Hours: null}, {Weight: 15, Hours: null}],
                },
            ]);

            const ctx = makeCtx();
            await syncOpenSheetAmounts(ctx, {jobIds: [9]});

            expect(weeklyUpdate).toHaveBeenCalledWith({
                where: {ID: 3},
                data: {TotalWeight: 25},
            });
        });

        it("OS-U3: evaluates source and target job weekly parents independently", async () => {
            loadsFindMany.mockResolvedValue([]);
            jobsFindMany.mockResolvedValue([{WeeklyID: 1}, {WeeklyID: 2}]);
            weekliesFindUnique
                .mockResolvedValueOnce({ID: 1, Revenue: 100, InvoiceID: null})
                .mockResolvedValueOnce({ID: 2, Revenue: null, InvoiceID: null});
            jobsFindMany
                .mockResolvedValueOnce([{WeeklyID: 1}, {WeeklyID: 2}])
                .mockResolvedValueOnce([
                    {WeeklyID: 2, Loads: [{Weight: 8, Hours: null}]},
                ]);

            const ctx = makeCtx();
            await syncOpenSheetAmounts(ctx, {jobIds: [10, 20]});

            expect(weeklyUpdate).toHaveBeenCalledTimes(1);
            expect(weeklyUpdate).toHaveBeenCalledWith({
                where: {ID: 2},
                data: {TotalWeight: 8},
            });
        });
    });
});
