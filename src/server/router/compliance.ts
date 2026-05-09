import {createRouter} from "./context";

import {z} from "zod";

import type {FormExpiryCadence} from "@prisma/client";

import {

    driverMissingRequiredForm,

    entityDistinctTruckCount,

    getDriverFormComplianceEndDate,

    isDriverFormExpiringSoon,

    isOoFormRequired,

    ooEntityKey,

    ooEntityTrucksVitalOk,

    type DriverComplianceShape,

    type DriverFormRow,

    type FormOptionComplianceShape,

} from "../../utils/driverFormCompliance";



type FormOptRow = FormOptionComplianceShape & {displayName: string};



function buildFormOptRows(

    formOptions: {

        Form: number;

        FleetWide: boolean;

        ExpiryCadence: FormExpiryCadence;

        ValidityMonths: number | null;

        W2Visible: boolean;

        OOVisible: boolean;

        W2Required: boolean;

        OORequired: boolean;

        Forms: {DisplayName: string; Name: string};

    }[],

): {optShape: FormOptionComplianceShape[]; optByForm: Map<number, FormOptRow>} {

    const optRows: FormOptRow[] = formOptions.map((o) => ({

        Form: o.Form,

        FleetWide: o.FleetWide,

        ExpiryCadence: o.ExpiryCadence,

        ValidityMonths: o.ValidityMonths,

        W2Visible: o.W2Visible,

        OOVisible: o.OOVisible,

        W2Required: o.W2Required,

        OORequired: o.OORequired,

        displayName: o.Forms.DisplayName || o.Forms.Name,

    }));

    const optShape: FormOptionComplianceShape[] = optRows.map((r) => ({
        Form: r.Form,
        FleetWide: r.FleetWide,
        ExpiryCadence: r.ExpiryCadence,
        ValidityMonths: r.ValidityMonths,
        W2Visible: r.W2Visible,
        OOVisible: r.OOVisible,
        W2Required: r.W2Required,
        OORequired: r.OORequired,
    }));

    const optByForm = new Map<number, FormOptRow>();

    for (const r of optRows) {

        optByForm.set(r.Form, r);

    }

    return {optShape, optByForm};

}



function toComplianceShape(d: {

    ID: number;

    CarrierID: number | null;

    OwnerOperator: boolean;

    DriverForms: {

        Form: number;

        Expiration: Date | null;

        Created: Date;

        CarrierID: number | null;

        Filer: string | null;

    }[];

    TrucksDriven?: DriverComplianceShape["TrucksDriven"];

}): DriverComplianceShape {

    return {

        ID: d.ID,

        CarrierID: d.CarrierID,

        OwnerOperator: d.OwnerOperator,

        DriverForms: d.DriverForms.map((df) => ({

            Form: df.Form,

            Expiration: df.Expiration,

            Created: df.Created,

            CarrierID: df.CarrierID ?? null,

            Filer: df.Filer ?? null,

        })),

        TrucksDriven: d.TrucksDriven,

    };

}



function toDriverFormRow(df: {

    Form: number;

    Expiration: Date | null;

    Created: Date;

    CarrierID: number | null;

    Filer: string | null;

}): DriverFormRow {

    return {

        Form: df.Form,

        Expiration: df.Expiration,

        Created: df.Created,

        CarrierID: df.CarrierID ?? null,

        Filer: df.Filer ?? null,

    };

}



export const complianceRouter = createRouter()

    .query("driverFormsSummary", {

        async resolve({ctx}) {

            const [drivers, formOptions] = await Promise.all([

                ctx.prisma.drivers.findMany({

                    where: {

                        OR: [{Deleted: false}, {Deleted: null}],

                    },

                    include: {

                        DriverForms: true,

                        TrucksDriven: {include: {Trucks: true}},

                    },

                }),

                ctx.prisma.formOptions.findMany({include: {Forms: true}}),

            ]);



            const {optShape, optByForm} = buildFormOptRows(formOptions);



            const dShape: DriverComplianceShape[] = drivers.map((d) => toComplianceShape(d));



            let w2Issues = 0;

            let ooIssues = 0;

            const countedOoEntity = new Set<string>();

            for (const d of drivers) {

                const shape = dShape.find((x) => x.ID === d.ID);
                if (!shape) continue;

                if (!d.OwnerOperator) {

                    if (driverMissingRequiredForm(shape, optShape, dShape, "w2")) {

                        w2Issues++;

                    }

                } else {

                    const ek = ooEntityKey(d.CarrierID, d.ID);

                    if (countedOoEntity.has(ek)) continue;

                    countedOoEntity.add(ek);

                    const formsBad = driverMissingRequiredForm(shape, optShape, dShape, "oo");

                    const entityDrivers = drivers.filter(

                        (x) => x.OwnerOperator && ooEntityKey(x.CarrierID, x.ID) === ek,

                    );

                    const trucksBad = !ooEntityTrucksVitalOk(

                        entityDrivers.map((ed) => ({TrucksDriven: ed.TrucksDriven})),

                    );

                    if (formsBad || trucksBad) {

                        ooIssues++;

                    }

                }

            }



            const daysAhead = 30;

            let expiringSoonW2 = 0;

            let expiringSoonOo = 0;

            const countedOoSoon = new Set<string>();



            for (const d of drivers) {

                if (!d.OwnerOperator) {

                    let hasSoon = false;

                    for (const df of d.DriverForms) {

                        const opt = optByForm.get(df.Form);

                        if (!opt?.W2Visible || opt.ExpiryCadence === "NONE") continue;

                        const rec = toDriverFormRow(df);

                        if (isDriverFormExpiringSoon(rec, opt.ExpiryCadence, opt.ValidityMonths, daysAhead)) {

                            hasSoon = true;

                            break;

                        }

                    }

                    if (hasSoon) expiringSoonW2++;

                } else {

                    const ek = ooEntityKey(d.CarrierID, d.ID);

                    if (countedOoSoon.has(ek)) continue;

                    const entityDrivers = drivers.filter(

                        (x) => x.OwnerOperator && ooEntityKey(x.CarrierID, x.ID) === ek,

                    );

                    let hasSoon = false;

                    for (const ed of entityDrivers) {

                        for (const df of ed.DriverForms) {

                            const opt = optByForm.get(df.Form);

                            if (!opt?.OOVisible || opt.ExpiryCadence === "NONE") continue;

                            const rec = toDriverFormRow(df);

                            if (

                                isDriverFormExpiringSoon(rec, opt.ExpiryCadence, opt.ValidityMonths, daysAhead)

                            ) {

                                hasSoon = true;

                                break;

                            }

                        }

                        if (hasSoon) break;

                    }

                    if (hasSoon) {

                        countedOoSoon.add(ek);

                        expiringSoonOo++;

                    }

                }

            }



            return {

                w2Issues,

                ooIssues,

                totalIssues: w2Issues + ooIssues,

                expiringSoonW2,

                expiringSoonOo,

                expiringSoonTotal: expiringSoonW2 + expiringSoonOo,

            };

        },

    })

    .query("driverFormsExpiringSoon", {

        input: z

            .object({

                daysAhead: z.number().min(1).max(366).optional(),

            })

            .optional(),

        async resolve({ctx, input}) {

            const daysAhead = input?.daysAhead ?? 30;



            const [drivers, formOptions] = await Promise.all([

                ctx.prisma.drivers.findMany({

                    where: {

                        OR: [{Deleted: false}, {Deleted: null}],

                    },

                    include: {

                        DriverForms: true,

                        TrucksDriven: {include: {Trucks: true}},

                        Carriers: {include: {States: true}},

                        States: true,

                    },

                    orderBy: [{LastName: "asc"}, {FirstName: "asc"}],

                }),

                ctx.prisma.formOptions.findMany({

                    include: {Forms: true},

                    orderBy: [{Forms: {DisplayName: "asc"}}, {Form: "asc"}],

                }),

            ]);



            const {optByForm} = buildFormOptRows(formOptions);

            const dShape: DriverComplianceShape[] = drivers.map((d) => toComplianceShape(d));

            type RowOut = {

                formId: number;

                formName: string;

                filed: string;

                endDate: string;

                cadence: FormExpiryCadence;

                required: boolean;

                filer: string | null;

                driverId: number;

                driverName: string;

            };

            const compareLabels = (a: string, b: string): number =>
                a.localeCompare(b, undefined, {sensitivity: "base"});



            const w2Groups: {driverId: number; title: string; rows: RowOut[]}[] = [];



            for (const d of drivers) {

                if (d.OwnerOperator) continue;

                const rows: RowOut[] = [];

                for (const df of d.DriverForms) {

                    const opt = optByForm.get(df.Form);

                    if (!opt?.W2Visible || opt.ExpiryCadence === "NONE") continue;

                    const rec = toDriverFormRow(df);

                    if (!isDriverFormExpiringSoon(rec, opt.ExpiryCadence, opt.ValidityMonths, daysAhead)) {

                        continue;

                    }

                    const end = getDriverFormComplianceEndDate(rec, opt.ExpiryCadence, opt.ValidityMonths);
                    if (!end) continue;

                    rows.push({

                        formId: df.Form,

                        formName: opt.displayName,

                        filed: rec.Created.toISOString(),

                        endDate: end.toISOString(),

                        cadence: opt.ExpiryCadence,

                        required: opt.W2Required,

                        filer: df.Filer,

                        driverId: d.ID,

                        driverName: `${d.FirstName} ${d.LastName}`.trim(),

                    });

                }

                if (rows.length === 0) continue;

                rows.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

                w2Groups.push({

                    driverId: d.ID,

                    title: `${d.FirstName} ${d.LastName}`.trim(),

                    rows,

                });

            }



            w2Groups.sort((a, b) => {
                return compareLabels(a.title, b.title);
            });



            const ooEntityKeys = new Set<string>();

            for (const d of drivers) {

                if (d.OwnerOperator) ooEntityKeys.add(ooEntityKey(d.CarrierID, d.ID));

            }



            const ooGroups: {entityKey: string; title: string; rows: RowOut[]}[] = [];



            for (const ek of Array.from(ooEntityKeys)) {

                const entityDrivers = drivers.filter(

                    (x) => x.OwnerOperator && ooEntityKey(x.CarrierID, x.ID) === ek,

                );

                if (entityDrivers.length === 0) continue;

                const entityLead = entityDrivers[0];
                if (!entityLead) continue;

                const entityShapes = dShape.filter((s) => entityDrivers.some((ed) => ed.ID === s.ID));

                const truckCount = entityDistinctTruckCount(entityShapes);

                const entityCarrierId = entityLead.CarrierID;



                const rows: RowOut[] = [];

                for (const ed of entityDrivers) {

                    const dFirst = ed.FirstName ?? "";

                    const dLast = ed.LastName ?? "";

                    const driverName = `${dFirst} ${dLast}`.trim();

                    for (const df of ed.DriverForms) {

                        const opt = optByForm.get(df.Form);

                        if (!opt?.OOVisible || opt.ExpiryCadence === "NONE") continue;

                        const rec = toDriverFormRow(df);

                        if (!isDriverFormExpiringSoon(rec, opt.ExpiryCadence, opt.ValidityMonths, daysAhead)) {

                            continue;

                        }

                        const end = getDriverFormComplianceEndDate(rec, opt.ExpiryCadence, opt.ValidityMonths);
                        if (!end) continue;

                        const required = isOoFormRequired(opt, truckCount);

                        rows.push({

                            formId: df.Form,

                            formName: opt.displayName,

                            filed: rec.Created.toISOString(),

                            endDate: end.toISOString(),

                            cadence: opt.ExpiryCadence,

                            required,

                            filer: df.Filer,

                            driverId: ed.ID,

                            driverName,

                        });

                    }

                }



                if (rows.length === 0) continue;

                rows.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());



                let title: string;

                if (entityCarrierId != null && entityCarrierId > 0) {

                    const withCarrier = entityDrivers.find((x) => x.Carriers?.Name);

                    title = withCarrier?.Carriers?.Name ?? `Carrier #${entityCarrierId}`;

                } else {
                    title = `${entityLead.FirstName} ${entityLead.LastName}`.trim();
                }



                ooGroups.push({entityKey: ek, title, rows});

            }



            ooGroups.sort((a, b) => {
                return compareLabels(a.title, b.title);
            });



            return {daysAhead, w2Groups, ooGroups};

        },

    });

