import {Writable} from "stream";
import type {NextApiRequest, NextApiResponse} from "next";

export type PdfHandlerResult = {
    statusCode: number;
    headers: Record<string, string>;
    body: Buffer;
};

/**
 * Invokes a Next.js PDF API handler and collects the response body (stream or JSON error).
 */
export async function runPdfHandler(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
    query: Record<string, string>,
    timeoutMs = 90000,
): Promise<PdfHandlerResult> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let settled = false;

        const finish = (statusCode: number, headers: Record<string, string>) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({
                statusCode,
                headers,
                body: Buffer.concat(chunks),
            });
        };

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error(`PDF handler timed out after ${timeoutMs}ms`));
            }
        }, timeoutMs);

        const res = Object.assign(
            new Writable({
                write(chunk, _encoding, callback) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                    callback();
                },
                final(callback) {
                    finish(res.statusCode, res.headers);
                    callback();
                },
            }),
            {
                statusCode: 200,
                headers: {} as Record<string, string>,
                setHeader(name: string, value: string) {
                    this.headers[name.toLowerCase()] = value;
                    return this;
                },
                getHeader(name: string) {
                    return this.headers[name.toLowerCase()];
                },
                status(code: number) {
                    this.statusCode = code;
                    return this;
                },
                json(data: unknown) {
                    this.setHeader("content-type", "application/json");
                    chunks.push(Buffer.from(JSON.stringify(data)));
                    finish(this.statusCode, this.headers);
                },
                send(data: string | Buffer) {
                    chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
                    finish(this.statusCode, this.headers);
                },
                end(data?: string | Buffer) {
                    if (data !== undefined) {
                        chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
                    }
                    finish(this.statusCode, this.headers);
                },
            },
        ) as unknown as NextApiResponse;

        const req = {
            method: "GET",
            query,
            headers: {},
        } as unknown as NextApiRequest;

        Promise.resolve(handler(req, res)).catch((err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                reject(err);
            }
        });
    });
}

export function assertValidPdf(result: PdfHandlerResult, label: string): void {
    if (result.statusCode !== 200) {
        throw new Error(
            `${label}: expected HTTP 200, got ${result.statusCode}: ${result.body.toString("utf8").slice(0, 200)}`,
        );
    }
    const contentType = result.headers["content-type"] ?? "";
    if (!contentType.includes("application/pdf")) {
        throw new Error(`${label}: expected application/pdf, got ${contentType}`);
    }
    if (result.body.length < 500) {
        throw new Error(`${label}: PDF too small (${result.body.length} bytes)`);
    }
    if (result.body.subarray(0, 4).toString("utf8") !== "%PDF") {
        throw new Error(`${label}: body does not start with %PDF magic bytes`);
    }
}
