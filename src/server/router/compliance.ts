import {createRouter} from "./context";
import {
    driverMissingRequiredForm,
    ooDriverTrucksVitalOk,
    type DriverComplianceShape,
    type FormOptionComplianceShape,
} from "../../utils/driverFormCompliance";

export const complianceRouter = createRouter().query("driverFormsSummary", {
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
            ctx.prisma.formOptions.findMany(),
        ]);

        const optShape: FormOptionComplianceShape[] = formOptions.map((o) => ({
            Form: o.Form,
            CarrierWide: o.CarrierWide,
            ExpiryCadence: o.ExpiryCadence,
            ValidityMonths: o.ValidityMonths,
            W2Visible: o.W2Visible,
            OOVisible: o.OOVisible,
            W2Required: o.W2Required,
            OORequired: o.OORequired,
        }));

        const dShape: DriverComplianceShape[] = drivers.map((d) => ({
            ID: d.ID,
            CarrierID: d.CarrierID,
            OwnerOperator: d.OwnerOperator,
            DriverForms: d.DriverForms.map((df) => ({
                Form: df.Form,
                Expiration: df.Expiration,
                Created: df.Created,
            })),
        }));

        let w2Issues = 0;
        let ooIssues = 0;
        for (const d of drivers) {
            const shape = dShape.find((x) => x.ID === d.ID)!;
            if (!d.OwnerOperator) {
                if (driverMissingRequiredForm(shape, optShape, dShape, "w2")) {
                    w2Issues++;
                }
            } else {
                const formsBad = driverMissingRequiredForm(shape, optShape, dShape, "oo");
                const trucksBad = !ooDriverTrucksVitalOk(d.TrucksDriven);
                if (formsBad || trucksBad) {
                    ooIssues++;
                }
            }
        }

        return {
            w2Issues,
            ooIssues,
            totalIssues: w2Issues + ooIssues,
        };
    },
});
