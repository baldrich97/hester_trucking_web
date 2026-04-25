import type {NextApiRequest, NextApiResponse} from "next";
import React from "react";
import {promisify} from "util";
import stream from "stream";
import {renderToStream} from "@react-pdf/renderer";
import {prisma} from "../../../../server/db/client";
import DriverFormsPrintable from "../../../../components/objects/DriverFormsPrintable";

const pipeline = promisify(stream.pipeline);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const kind = req.query.kind;
    if (kind !== "w2" && kind !== "oo") {
        res.status(400).end();
        return;
    }

    const isW2 = kind === "w2";

    const drivers = await prisma.drivers.findMany({
        where: {
            OwnerOperator: isW2 ? false : true,
            OR: [{Deleted: false}, {Deleted: null}],
        },
        include: {
            DriverForms: true,
            TrucksDriven: {include: {Trucks: true}},
        },
        orderBy: {LastName: "asc"},
    });

    const allForms = await prisma.formOptions.findMany({
        where: isW2 ? {W2Visible: true} : {OOVisible: true},
        include: {Forms: true},
        orderBy: [{PdfOrder: "asc"}, {ID: "asc"}],
    });

    const pdfStream = await renderToStream(
        React.createElement(DriverFormsPrintable, {
            title: isW2 ? "W-2 driver forms" : "Owner operator (non-W-2) forms",
            mode: isW2 ? "w2" : "oo",
            drivers,
            allForms,
        }) as React.ReactElement<Record<string, unknown>>,
    );

    res.setHeader("Content-Type", "application/pdf");
    const filename = isW2 ? "driver-forms-w2" : "driver-forms-oo";
    res.setHeader("Content-Disposition", `attachment; filename=${filename}.pdf`);
    await pipeline(pdfStream, res);
}
