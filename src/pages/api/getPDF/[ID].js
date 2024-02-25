import { promisify } from "util";
import stream from 'stream';
import InvoicePrintableBasic from "../../../components/objects/InvoicePrintableBasic";
import {prisma} from "../../../server/db/client";
import {renderToStream} from "@react-pdf/renderer";

const pipeline = promisify(stream.pipeline);

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
                }
            },
        }
    })

    let invoices = null;

    if (invoice.Consolidated) {
        invoices = await prisma.invoices.findMany({where: {ConsolidatedID: invoice.ID}, include: {Loads: true}})
    }

    const number = invoice.Number;

    const stream = await renderToStream(<InvoicePrintableBasic invoice={invoice} invoices={invoices}/>)
    res.setHeader('Content-Type', 'application/pdf');
    const filename = "Invoice-" + number;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
    await pipeline(stream, res);
};

export default handler;