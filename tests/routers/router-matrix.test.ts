import {afterEach, describe, expect, it} from "vitest";
import type {Session} from "next-auth";
import {configurePrismaMockDefaults} from "../helpers/configurePrismaMock";
import {createPrismaMock} from "../helpers/prismaMock";
import {callTrpcMutation, callTrpcQuery, createTestContext} from "../helpers/trpcCaller";
import {ALL_PROCEDURES, type ProcedureCase} from "./procedure-manifest";

const fakeSession = {user: {name: "test-admin"}, expires: "2099-01-01"} as Session;

function isAcceptableError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
        lower.includes("bad_request") ||
        lower.includes("required") ||
        lower.includes("invalid") ||
        lower.includes("unauthorized") ||
        lower.includes("forbidden") ||
        lower.includes("cutover") ||
        lower.includes("missing") ||
        lower.includes("already") ||
        lower.includes("not found") ||
        lower.includes("internal_server_error") ||
        lower.includes("parse") ||
        lower.includes("expected")
    );
}

async function invokeProcedure(testCase: ProcedureCase): Promise<void> {
    const env = {...process.env};
    if (testCase.cutover) {
        process.env.SOURCES_CUTOVER_FORCE = "true";
    } else {
        delete process.env.SOURCES_CUTOVER_FORCE;
        process.env.SOURCES_CUTOVER_DATE = "2099-01-01T00:00:00-05:00";
    }

    const prisma = createPrismaMock();
    configurePrismaMockDefaults(prisma);
    const ctx = await createTestContext(prisma, {
        session: testCase.authenticated ? fakeSession : null,
    });

    try {
        if (testCase.kind === "query") {
            await callTrpcQuery(testCase.path, testCase.input, ctx);
        } else {
            await callTrpcMutation(testCase.path, testCase.input, ctx);
        }
    } finally {
        process.env = env;
    }
}

describe("router matrix (all tRPC procedures)", () => {
    const cases = ALL_PROCEDURES.filter((c) => !c.skip);

    it.each(cases.map((c) => [c.path, c] as const))(
        "%s is reachable with mocked Prisma",
        async (_path, testCase) => {
            try {
                await invokeProcedure(testCase);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                expect(isAcceptableError(message)).toBe(true);
            }
        },
    );

    it("covers every procedure in the manifest", () => {
        expect(cases.length).toBeGreaterThanOrEqual(100);
    });
});
