import {createRouter} from "./context";
import {z} from "zod";
import {CompleteTrucksDriven} from "../../../prisma/zod";
import {Drivers, Trucks} from "@prisma/client";

export const trucksDrivenRouter = createRouter().query("search", {
    input: z.object({
        TruckID: z.number().optional(),
        DriverID: z.number().optional(),
    }),
    async resolve({ctx, input}) {
        const extraByKey = new Map<string, CompleteTrucksDriven>();

        /**
         * Rows for the Driver dropdown: only pairs for the selected truck.
         * Rows for the Truck dropdown: only pairs for the selected driver.
         * Never OR the two — that mixed drivers from unrelated trucks (and vice versa).
         */
        if (input.TruckID) {
            const associated = await ctx.prisma.trucksDriven.findMany({
                where: {TruckID: input.TruckID},
                include: {Trucks: true, Drivers: true},
            });
            for (const item of associated) {
                const key = `${item.TruckID}-${item.DriverID}`;
                if (!extraByKey.has(key)) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    item.Drivers.Recommend = true;
                    extraByKey.set(key, item as CompleteTrucksDriven);
                }
            }
        }

        if (input.DriverID) {
            const associated = await ctx.prisma.trucksDriven.findMany({
                where: {DriverID: input.DriverID},
                include: {Trucks: true, Drivers: true},
            });
            for (const item of associated) {
                const key = `${item.TruckID}-${item.DriverID}`;
                const existing = extraByKey.get(key);
                if (existing) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    existing.Trucks.Recommend = true;
                } else {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    item.Trucks.Recommend = true;
                    extraByKey.set(key, item as CompleteTrucksDriven);
                }
            }
        }

        const extra = Array.from(extraByKey.values());
        const data: {Drivers?: Drivers; Trucks?: Trucks}[] = [];

        const notDeleted = {OR: [{Deleted: false}, {Deleted: null}]};

        if (input.TruckID) {
            const _data = await ctx.prisma.drivers.findMany({
                where: notDeleted,
                take: 50,
                orderBy: {ID: "desc"},
            });
            _data.forEach((item) => data.push({Drivers: item}));
        }
        if (input.DriverID) {
            const _data = await ctx.prisma.trucks.findMany({
                where: notDeleted,
                take: 50,
                orderBy: {ID: "desc"},
            });
            _data.forEach((item) => data.push({Trucks: item}));
        }

        return [...extra, ...data];
    },
});
