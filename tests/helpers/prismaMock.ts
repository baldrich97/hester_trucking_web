import {mockDeep, mockReset, type DeepMockProxy} from "vitest-mock-extended";
import type {PrismaClient} from "@prisma/client";
import {beforeEach} from "vitest";

export type MockPrisma = DeepMockProxy<PrismaClient>;

export function createPrismaMock(): MockPrisma {
    const prisma = mockDeep<PrismaClient>();
    prisma.$transaction.mockImplementation(async (fn) =>
        (fn as (tx: MockPrisma) => Promise<unknown>)(prisma),
    );
    return prisma;
}

export function usePrismaMock(): MockPrisma {
    const prisma = createPrismaMock();
    beforeEach(() => {
        mockReset(prisma);
    });
    return prisma;
}
