import { promisify } from "util";
import stream from 'stream';
import InvoicePrintableBasic from "../../../components/objects/InvoicePrintableBasic";
import {prisma} from "../../../server/db/client";
import {renderToStream} from "@react-pdf/renderer";

const pipeline = promisify(stream.pipeline);

const handler = async (req, res) => {
    console.log(req.query)
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

    const stream = await renderToStream(<InvoicePrintableBasic invoice={invoice}/>)
    res.setHeader('Content-Type', 'application/pdf');
    const filename = "Invoice-" + ID;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
    await pipeline(stream, res);
};

export default handler;