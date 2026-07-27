import {spawn, type ChildProcess} from "child_process";
import path from "path";

const PORT = process.env.PDF_TEST_PORT ?? "3001";
const BASE = `http://127.0.0.1:${PORT}`;

let child: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok || res.status === 404) return;
        } catch {
            // server not ready
        }
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Dev server did not start at ${url} within ${timeoutMs}ms`);
}

export async function setup(): Promise<void> {
    process.env.PDF_TEST_BASE_URL = BASE;
    process.env.PDF_TEST_PORT = PORT;

    if (process.env.PDF_TEST_SKIP_SERVER === "yes") {
        await waitForServer(BASE, 5000);
        return;
    }

    const cwd = path.resolve(__dirname, "../..");
    child = spawn(`npm run dev -- -p ${PORT}`, {
        cwd,
        shell: true,
        stdio: "pipe",
        env: {
            ...process.env,
            SOURCES_CUTOVER_FORCE: "true",
            NEXT_PUBLIC_SOURCES_CUTOVER_FORCE: "true",
        },
    });

    child.stdout?.on("data", () => undefined);
    child.stderr?.on("data", () => undefined);

    await waitForServer(BASE, 120000);
}

export async function teardown(): Promise<void> {
    if (child && !child.killed) {
        if (process.platform === "win32") {
            spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"]);
        } else {
            child.kill("SIGTERM");
        }
    }
}
