import { promisify } from "util";
import stream from 'stream';
import InvoicePrintableBasic from "../../components/objects/InvoicePrintableBasic";
import {prisma} from "../../server/db/client";
import {renderToStream} from "@react-pdf/renderer";

const pipeline = promisify(stream.pipeline);

const handler = async (req, res) => {
    // const { ID } = req.query;
    //
    // if (!ID) {
    //     return;
    // }

    const invoice = await prisma.invoices.findFirst({
        where: {
            ID: 3
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

    console.log('HERE')
    console.log(invoice)

    const stream = await renderToStream(<InvoicePrintableBasic invoice={invoice}/>)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=test.pdf');
    await pipeline(stream, res);
};

export default handler;