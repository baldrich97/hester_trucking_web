/**
 * Dev/test-only tRPC timing instrumentation.
 *
 * Every procedure call (all routers are built via createRouter, so the
 * middleware covers everything) records path/type/duration into a small
 * in-memory ring buffer, and slow calls are logged to the server console:
 *
 *   [trpc slow] query loads.getAllPage 512ms
 *
 * Disabled entirely in production builds. Tune the log threshold with
 * TRPC_SLOW_MS (default 300), or silence logs with TRPC_TIMING=off.
 */

export type TrpcTiming = {
    path: string;
    type: string;
    durationMs: number;
    ok: boolean;
    /** Epoch ms when the call started. */
    at: number;
};

const MAX_SAMPLES = 500;
const samples: TrpcTiming[] = [];

export function timingEnabled(): boolean {
    if (process.env.TRPC_TIMING === "off") return false;
    return process.env.NODE_ENV !== "production";
}

function slowThresholdMs(): number {
    const n = Number(process.env.TRPC_SLOW_MS);
    return Number.isFinite(n) && n >= 0 ? n : 300;
}

export function recordTrpcTiming(t: TrpcTiming): void {
    samples.push(t);
    if (samples.length > MAX_SAMPLES) samples.shift();
    if (t.durationMs >= slowThresholdMs()) {
        console.warn(
            `[trpc slow] ${t.type} ${t.path} ${t.durationMs}ms${t.ok ? "" : " (error)"}`,
        );
    }
}

/** Recent call timings, oldest first (dev/test inspection + assertions). */
export function recentTrpcTimings(): readonly TrpcTiming[] {
    return samples;
}

export function clearTrpcTimings(): void {
    samples.length = 0;
}
