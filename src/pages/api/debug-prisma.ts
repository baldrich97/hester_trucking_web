// pages/api/debug-prisma.ts
import type { NextApiHandler } from 'next';
import fs from 'fs';
import path from 'path';

const handler: NextApiHandler = (req, res) => {
    const folder = path.resolve(process.cwd(), 'prisma/generated/client');
    let files = [];
    try {
        files = fs.readdirSync(folder);
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        files = [`Error reading ${folder}: ${e.message}`];
    }
    res.json({
        platform: process.platform,
        arch: process.arch,
        openssl: process.versions.openssl,
        generatedClientFiles: files,
    });
};

export default handler;
