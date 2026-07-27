import {expect} from "vitest";
import type {MockPrisma} from "./prismaMock";

type ModelKey = keyof MockPrisma;

export function lastFindManyCall<T extends ModelKey>(
    prisma: MockPrisma,
    model: T,
): Record<string, unknown> | undefined {
    const client = prisma[model] as {findMany?: {mock?: {calls: unknown[][]}}};
    const calls = client.findMany?.mock?.calls ?? [];
    if (calls.length === 0) return undefined;
    return calls[calls.length - 1]![0] as Record<string, unknown>;
}

export function lastCountCall<T extends ModelKey>(
    prisma: MockPrisma,
    model: T,
): Record<string, unknown> | undefined {
    const client = prisma[model] as {count?: {mock?: {calls: unknown[][]}}};
    const calls = client.count?.mock?.calls ?? [];
    if (calls.length === 0) return undefined;
    return calls[calls.length - 1]![0] as Record<string, unknown>;
}

export function expectFindManyWhere(
    prisma: MockPrisma,
    model: ModelKey,
    where: Record<string, unknown>,
    extra?: Record<string, unknown>,
): void {
    const call = lastFindManyCall(prisma, model);
    expect(call).toBeDefined();
    expect(call!.where).toEqual(expect.objectContaining(where));
    if (extra) {
        for (const [key, value] of Object.entries(extra)) {
            expect(call![key]).toEqual(value);
        }
    }
}

export function expectCountWhere(prisma: MockPrisma, model: ModelKey, where: Record<string, unknown>): void {
    const call = lastCountCall(prisma, model);
    expect(call).toBeDefined();
    expect(call!.where).toEqual(expect.objectContaining(where));
}
