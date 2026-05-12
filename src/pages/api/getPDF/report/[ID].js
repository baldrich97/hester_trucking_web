import {promisify} from "util";
import stream from "stream";
import {renderToStream} from "@react-pdf/renderer";
import SourceReportPrintable from "../../../../components/objects/SourceReportPrintable";
import {prisma} from "../../../../server/db/client";

const pipeline = promisify(stream.pipeline);

const handler = async (req, res) => {
    const {ID} = req.query;
    if (!ID) {
        res.status(400).json({error: "Missing report parameters."});
        return;
    }

    const parts = ID.split("|");
    if (parts.length < 3) {
        res.status(400).json({error: "Invalid report parameters."});
        return;
    }

    const sourceId = parseInt(parts[0], 10);
    const startDateRaw = decodeURIComponent(parts[1]);
    const endDateRaw = decodeURIComponent(parts[2]);

    if (!sourceId || !startDateRaw || !endDateRaw) {
        res.status(400).json({error: "Missing required parameters."});
        return;
    }

    const startDate = new Date(startDateRaw);
    const endDate = new Date(endDateRaw);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        res.status(400).json({error: "Invalid date parameters."});
        return;
    }

    if (startDate > endDate) {
        res.status(400).json({error: "Start date cannot be after end date."});
        return;
    }

    const source = await prisma.sources.findUnique({
        where: {ID: sourceId},
        select: {ID: true, Name: true},
    });

    if (!source) {
        res.status(404).json({error: "Source not found."});
        return;
    }

    const loads = await prisma.loads.findMany({
        where: {
            OR: [{Deleted: false}, {Deleted: null}],
            StartDate: {
                gte: startDate,
                lte: endDate,
            },
            LoadTypes: {
                is: {
                    SourceLoadTypes: {
                        some: {SourceID: sourceId},
                    },
                },
            },
        },
        include: {
            Customers: {select: {Name: true}},
            LoadTypes: {select: {Description: true}},
            DeliveryLocations: {select: {Description: true}},
        },
        orderBy: [{StartDate: "asc"}, {ID: "asc"}],
    });

    const rows = loads.map((load) => ({
        ID: load.ID,
        StartDate: load.StartDate,
        TicketNumber: load.TicketNumber,
        Weight: load.Weight ?? 0,
        TotalAmount: load.TotalAmount ?? 0,
        TotalRate: load.TotalRate ?? 0,
        LoadType: load.LoadTypes?.Description ?? "Unknown",
        Customer: load.Customers?.Name ?? "Unknown",
        DeliveryLocation: load.DeliveryLocations?.Description ?? "Unknown",
    }));

    const grouped = new Map();
    for (const row of rows) {
        const key = row.LoadType;
        const current = grouped.get(key) ?? {
            loadType: key,
            totalLoads: 0,
            totalTonnage: 0,
            totalAmount: 0,
        };
        current.totalLoads += 1;
        current.totalTonnage += row.Weight;
        current.totalAmount += row.TotalAmount;
        grouped.set(key, current);
    }

    const summary = {
        totalLoads: rows.length,
        totalTonnage: rows.reduce((acc, row) => acc + row.Weight, 0),
        totalAmount: rows.reduce((acc, row) => acc + row.TotalAmount, 0),
        byLoadType: Array.from(grouped.values()).sort((a, b) => a.loadType.localeCompare(b.loadType)),
    };

    const pdfStream = await renderToStream(
        <SourceReportPrintable
            reportTitle="Source Audit Report"
            entityLabel="Source"
            sourceName={source.Name}
            startDate={startDateRaw}
            endDate={endDateRaw}
            rows={rows}
            summary={summary}
        />,
    );

    res.setHeader("Content-Type", "application/pdf");
    const safeSource = source.Name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const filename = `SourceReport-${safeSource}-${startDateRaw}-to-${endDateRaw}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    await pipeline(pdfStream, res);
};

export default handler;
