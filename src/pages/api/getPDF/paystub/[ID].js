import { promisify } from "util";
import stream from 'stream';
import InvoicePrintableBasic from "../../../../components/objects/InvoicePrintableBasic";
import {prisma} from "../../../../server/db/client";
import {renderToStream} from "@react-pdf/renderer";
import PayStubPrintable from "../../../../components/objects/PayStubPrintable";

const pipeline = promisify(stream.pipeline);

const handler = async (req, res) => {
    const { ID } = req.query;

    if (!ID) {
        return;
    }

    const payStub = await prisma.payStubs.findFirst({
        where: {
            ID: parseInt(ID),
        },
        include: {
            Drivers: true,
            Jobs: {
                include: {
                    LoadTypes: {
                        select: {
                            Description: true
                        }
                    },
                    DeliveryLocations: {
                        select: {
                            Description: true
                        }
                    },
                    Customers: {
                        select: {
                            Name: true
                        }
                    },
                    Loads: {
                        include: {
                            Trucks: true
                        },
                        orderBy: {
                            StartDate: 'asc'
                        }
                    }
                }
            },
        },
    });

    const stream = await renderToStream(<PayStubPrintable payStub={payStub}/>)
    res.setHeader('Content-Type', 'application/pdf');
    const filename = "Paystub-" + payStub.ID;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
    await pipeline(stream, res);
};

export default handler;