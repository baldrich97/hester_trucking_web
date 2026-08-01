import type {PrismaClient} from "@prisma/client";



type ModelName = keyof PrismaClient;



/**

 * Tracks rows created during a DB test run and deletes them in FK-safe order.

 * Register every create with `track()`; call `cleanup()` in afterAll.

 */

export class TestRunTracker {

    private readonly buckets = new Map<ModelName, number[]>();



    track(model: ModelName, id: number): void {

        if (!Number.isFinite(id)) return;

        const list = this.buckets.get(model) ?? [];

        if (!list.includes(id)) list.push(id);

        this.buckets.set(model, list);

    }

    private readonly driverFormPairs = new Set<string>();

    trackDriverForm(driverId: number, formId: number): void {
        if (!Number.isFinite(driverId) || !Number.isFinite(formId)) return;
        this.driverFormPairs.add(`${driverId}:${formId}`);
    }

    driverFormKeys(): string[] {
        return [...this.driverFormPairs];
    }



    ids(model: ModelName): number[] {

        return [...(this.buckets.get(model) ?? [])];

    }



    async cleanup(prisma: PrismaClient): Promise<void> {

        const del = async (model: ModelName, ids: number[]) => {

            if (ids.length === 0) return;

            const client = prisma[model] as {deleteMany?: (args: unknown) => Promise<unknown>};

            if (typeof client?.deleteMany !== "function") return;

            await client.deleteMany({where: {ID: {in: ids}}}).catch(() => undefined);

        };



        await del("loads", this.ids("loads"));



        for (const jobId of this.ids("jobs")) {

            await prisma.jobs

                .updateMany({

                    where: {ID: jobId},

                    data: {PaidOut: false, PayStubID: null},

                })

                .catch(() => undefined);

        }



        await del("jobs", this.ids("jobs"));

        await del("weeklies", this.ids("weeklies"));

        await del("dailies", this.ids("dailies"));

        await del("invoices", this.ids("invoices"));

        await del("payStubs", this.ids("payStubs"));

        await del("trucksDriven", this.ids("trucksDriven"));

        for (const key of this.driverFormKeys()) {
            const [driverId, formId] = key.split(":").map(Number);
            await prisma.driverForms
                .deleteMany({where: {Driver: driverId!, Form: formId!}})
                .catch(() => undefined);
        }

        for (const carrierId of this.ids("carriers")) {
            await prisma.driverForms
                .deleteMany({
                    where: {CarrierID: carrierId, Drivers: {OwnerOperator: true}},
                })
                .catch(() => undefined);
            await prisma.drivers
                .updateMany({where: {CarrierID: carrierId}, data: {CarrierID: null}})
                .catch(() => undefined);
        }

        await del("carriers", this.ids("carriers"));

        for (const sourceId of this.ids("sources")) {

            await prisma.sourceLoadTypes

                .deleteMany({where: {SourceID: sourceId}})

                .catch(() => undefined);

        }



        await del("sources", this.ids("sources"));

        await del("loadTypes", this.ids("loadTypes"));

        await del("customers", this.ids("customers"));

        await del("drivers", this.ids("drivers"));

        await del("trucks", this.ids("trucks"));

        await del("deliveryLocations", this.ids("deliveryLocations"));

        await del("formOptions", this.ids("formOptions"));
        await del("forms", this.ids("forms"));
    }

}


