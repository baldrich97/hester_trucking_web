import {createRouter} from "./context";
import {z} from "zod";
import {CompleteTrucksDriven} from '../../../prisma/zod';
import { Drivers, Trucks } from "@prisma/client";

export const trucksDrivenRouter = createRouter()
    .query('search', {
        input: z.object({
            TruckID: z.number().optional(),
            DriverID: z.number().optional()
        }),
        async resolve({ctx, input}) {
            const extra: CompleteTrucksDriven[] = [];
            //console.log('INPUTS', input)
            //console.log('WHAT HAPPENED')
            if (input.TruckID || input.DriverID) {
                const associated = await ctx.prisma.trucksDriven.findMany({
                    where: {
                        OR: [
                            {
                                TruckID: input.TruckID
                            },
                            {
                                DriverID: input.DriverID
                            }
                        ]
                    }, include: {Trucks: true, Drivers: true}
                })
                //let test = [];
                associated.forEach((item) => {
                    //test.push(item.Trucks)
                    if (input.TruckID) {
                        if (extra.filter((_item) => _item.DriverID === item.DriverID).length === 0) {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            item.Drivers.Recommend = true;
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            extra.push(item)
                        }
                    }
                    if (input.DriverID) {
                        if (extra.filter((_item) => _item.TruckID === item.TruckID).length === 0) {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            item.Trucks.Recommend = true;
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            extra.push(item)
                        }
                    }
                })
                //console.log('TEST', test)
            }
            // const extraCondition = extra.length > 0 ? {
            //     NOT: {
            //         ID: {
            //             in: extra.map((item) => item.ID)
            //         }
            //     }
            // } : {}
            const data: { Drivers?: Drivers; Trucks?: Trucks; }[] = [];

            if (input.TruckID) {
                const _data = await ctx.prisma.drivers.findMany({
                    take: 10,
                    orderBy: {
                        FirstName: 'asc'
                    },
                    // where: {
                    //     ...extraCondition
                    // },
                })
                _data.forEach((item) => data.push({Drivers: item}))
            }
            if (input.DriverID) {
                const _data = await ctx.prisma.trucks.findMany({
                    take: 10,
                    orderBy: {
                        Name: 'asc'
                    },
                    // where: {
                    //     ...extraCondition
                    // },
                })
                _data.forEach((item) => data.push({Trucks: item}))
            }

            return [...extra, ...data];

        }
    });

