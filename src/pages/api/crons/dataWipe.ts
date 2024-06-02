import {prisma} from "../../../server/db/client";



export async function GET() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prisma.$executeRaw(`call wipe_data`);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prisma.$executeRaw(`call wipe_customers`);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prisma.$executeRaw(`call wipe_drivers`);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prisma.$executeRaw(`call wipe_locations`);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prisma.$executeRaw(`call trucks`);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prisma.$executeRaw(`call trucks`);
}