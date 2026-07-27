import {mockDeep, mockReset, type DeepMockProxy} from "vitest-mock-extended";
import type {PrismaClient} from "@prisma/client";
import {beforeEach} from "vitest";

export type MockPrisma = DeepMockProxy<PrismaClient>;

export function createPrismaMock(): MockPrisma {
    return mockDeep<PrismaClient>();
}

export function usePrismaMock(): MockPrisma {
    const prisma = createPrismaMock();
    beforeEach(() => {
        mockReset(prisma);
    });
    return prisma;
}
