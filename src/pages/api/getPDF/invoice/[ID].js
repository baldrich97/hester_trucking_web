import { promisify } from "util";
import stream from 'stream';
import InvoicePrintableBasic from "../../../../components/objects/InvoicePrintableBasic";
import {prisma} from "../../../../server/db/client";
import {renderToStream} from "@react-pdf/renderer";

const pipeline = promisify(stream.pipeline);

// Assume `weeklies` is an array of objects with at least { DeliveryLocationID, Week }
function parseISOWeek(isoWeekStr) {
    const [year, weekStr] = isoWeekStr.split('-W');
    return parseInt(year) * 100 + parseInt(weekStr); // e.g. "2025-W23" → 202523
}

function groupAndSortWeekliesFlat(weeklies) {
    const groups = new Map();

    // Group weeklies by DeliveryLocationID
    for (const w of weeklies) {
        const id = w.DeliveryLocationID;
        if (!groups.has(id)) {
            groups.set(id, []);
        }
        groups.get(id).push(w);
    }

    // Sort groups by earliest ISO week
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
        const minA = Math.min(...a[1].map(w => parseISOWeek(w.Week)));
        const minB = Math.min(...b[1].map(w => parseISOWeek(w.Week)));
        return minA - minB;
    });

    // Flatten sorted groups into a single array
    return sortedGroups.flatMap(([_, group]) => group);
}



const handler = async (req, res) => {
    const { ID } = req.query;

    if (!ID) {
        return;
    }

    const invoice = await prisma.invoices.findFirst({
        where: {
            ID: parseInt(ID)
        },
        include: {
            Customers: {
                include: {
                    States: true
                }
            },
            Loads: {
                include: {
                    LoadTypes: true,
                    Trucks: true,
                    Drivers: true,
                    DeliveryLocations: true
                },
            },
            Weeklies: {
                include: {
                    LoadTypes: true,
                    DeliveryLocations: true
                },
                orderBy: {
                    Week: 'asc'
                }
            }
        }
    })

    let invoices = null;

    if (invoice.Consolidated) {
        invoices = await prisma.invoices.findMany({where: {ConsolidatedID: invoice.ID}, include: {Loads: true}})
    }

    if (invoice.Weeklies) {
        invoice.Weeklies = await groupAndSortWeekliesFlat(invoice.Weeklies)
    }

    console.log('WEEKLIES', invoice.Weeklies)

    const number = invoice.Number;

    const stream = await renderToStream(<InvoicePrintableBasic invoice={invoice} invoices={invoices}/>)
    res.setHeader('Content-Type', 'application/pdf');
    const filename = "Invoice-" + number;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
    await pipeline(stream, res);
};

export default handler;