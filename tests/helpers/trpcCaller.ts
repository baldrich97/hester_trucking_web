import {createNextApiHandler} from "@trpc/server/adapters/next";
import type {NextApiRequest, NextApiResponse} from "next";
import superjson from "superjson";
import type {Session} from "next-auth";
import {appRouter} from "../../src/server/router";
import {createContextInner} from "../../src/server/router/context";
import type {PrismaClient} from "@prisma/client";

export type TestContext = Awaited<ReturnType<typeof createContextInner>>;

export async function createTestContext(
    prisma: PrismaClient | unknown,
    options?: {session?: Session | null},
): Promise<TestContext> {
    const ctx = await createContextInner({session: options?.session ?? null});
    return {
        ...ctx,
        prisma: prisma as TestContext["prisma"],
        warnings: [],
    };
}

function createHandler(getCtx: () => Promise<TestContext>) {
    return createNextApiHandler({
        router: appRouter,
        createContext: getCtx,
    });
}

function runHandler(
    handler: ReturnType<typeof createNextApiHandler>,
    req: Partial<NextApiRequest> & {method: string; query: Record<string, string | string[] | undefined>},
    body?: string,
): Promise<{status: number; body: unknown}> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const res = {
            statusCode: 200,
            headers: {} as Record<string, string>,
            setHeader(name: string, value: string) {
                this.headers[name.toLowerCase()] = value;
            },
            getHeader(name: string) {
                return this.headers[name.toLowerCase()];
            },
            status(code: number) {
                this.statusCode = code;
                return this;
            },
            send(data: string) {
                try {
                    resolve({status: this.statusCode, body: JSON.parse(data)});
                } catch {
                    resolve({status: this.statusCode, body: data});
                }
            },
            json(data: unknown) {
                resolve({status: this.statusCode, body: data});
            },
            end(data?: string) {
                if (data) {
                    this.send(data);
                } else {
                    resolve({status: this.statusCode, body: null});
                }
            },
        } as unknown as NextApiResponse;

        const request = {
            ...req,
            headers: req.headers ?? {},
            body: body ?? req.body,
        } as NextApiRequest;

        Promise.resolve(handler(request, res)).catch(reject);
    });
}

function unwrapTrpcBody(body: unknown): unknown {
    if (!body || typeof body !== "object") return body;
    const b = body as Record<string, unknown>;
    if (Array.isArray(b)) {
        return b.map(unwrapTrpcBody);
    }
    if ("error" in b && b.error) {
        const err = b.error as {json?: {message?: string}; message?: string};
        throw new Error(err.json?.message ?? err.message ?? "tRPC error");
    }
    if ("result" in b && b.result && typeof b.result === "object") {
        const result = b.result as {data?: unknown};
        if (result.data !== undefined) {
            return superjson.deserialize(result.data as never);
        }
    }
    if ("data" in b) {
        return superjson.deserialize(b.data as never);
    }
    return body;
}

function serializeTrpcInput(input: unknown): string {
    return JSON.stringify(superjson.serialize(input));
}

export async function callTrpcQuery<T>(
    path: string,
    input: unknown,
    ctx: TestContext,
): Promise<T> {
    const handler = createHandler(async () => ctx);
    const query: Record<string, string> = {trpc: path};
    if (input !== undefined) {
        query.input = serializeTrpcInput(input);
    }
    const {status, body} = await runHandler(handler, {
        method: "GET",
        query,
    });
    if (status >= 400) {
        throw new Error(`tRPC query ${path} failed with status ${status}: ${JSON.stringify(body)}`);
    }
    return unwrapTrpcBody(body) as T;
}

export async function callTrpcMutation<T>(
    path: string,
    input: unknown,
    ctx: TestContext,
): Promise<T> {
    const handler = createHandler(async () => ctx);
    const payload = JSON.stringify(superjson.serialize(input));
    const {status, body} = await runHandler(
        handler,
        {
            method: "POST",
            query: {trpc: path},
            headers: {"content-type": "application/json"},
        },
        payload,
    );
    if (status >= 400) {
        throw new Error(`tRPC mutation ${path} failed with status ${status}: ${JSON.stringify(body)}`);
    }
    return unwrapTrpcBody(body) as T;
}
