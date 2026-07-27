import type {MockPrisma} from "./prismaMock";

type MockFn = {mockResolvedValue: (v: unknown) => void};

function setResolved(fn: unknown, value: unknown): void {
    if (fn && typeof fn === "object" && "mockResolvedValue" in fn) {
        (fn as MockFn).mockResolvedValue(value);
    }
}

/** Safe defaults so any tRPC procedure can execute without throwing on missing mock setup. */
export function configurePrismaMockDefaults(prisma: MockPrisma): void {
    for (const modelKey of Object.keys(prisma)) {
        const model = prisma[modelKey as keyof MockPrisma];
        if (!model || typeof model !== "object") continue;
        for (const [method, fn] of Object.entries(model as Record<string, unknown>)) {
            if (method === "findMany") setResolved(fn, []);
            else if (method === "findFirst" || method === "findUnique") setResolved(fn, null);
            else if (method === "count") setResolved(fn, 0);
            else if (method === "aggregate") {
                setResolved(fn, {_count: {_all: 0}, _max: {ID: 0, Number: 0}, _min: {ID: 0}});
            } else if (method === "create" || method === "update" || method === "delete" || method === "upsert") {
                setResolved(fn, {ID: 1});
            } else if (method === "updateMany" || method === "deleteMany") {
                setResolved(fn, {count: 0});
            }
        }
    }
}
