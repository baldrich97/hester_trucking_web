type LoadSnapshot = {
    ID: number;
    DriverID: number | null;
    TruckID: number | null;
    StartDate: Date | null;
    CustomerID: number | null;
    LoadTypeID: number | null;
    DeliveryLocationID: number | null;
};

const activeLoadWhere = {OR: [{Deleted: false}, {Deleted: null}]};

async function otherLoadsUseTruckDriven(
    ctx: any,
    excludeLoadId: number,
    driverId: number,
    truckId: number,
    startDate: Date,
): Promise<boolean> {
    const count = await ctx.prisma.loads.count({
        where: {
            ID: {not: excludeLoadId},
            DriverID: driverId,
            TruckID: truckId,
            StartDate: startDate,
            ...activeLoadWhere,
        },
    });
    return count > 0;
}

async function ensureTrucksDriven(
    ctx: any,
    driverId: number,
    truckId: number,
    startDate: Date,
): Promise<void> {
    const existing = await ctx.prisma.trucksDriven.findFirst({
        where: {DriverID: driverId, TruckID: truckId, DateDriven: startDate},
    });
    if (!existing) {
        await ctx.prisma.trucksDriven.create({
            data: {DriverID: driverId, TruckID: truckId, DateDriven: startDate},
        });
    }
}

async function maybeRemoveTrucksDriven(
    ctx: any,
    excludeLoadId: number,
    driverId: number,
    truckId: number,
    startDate: Date,
): Promise<void> {
    const stillUsed = await otherLoadsUseTruckDriven(ctx, excludeLoadId, driverId, truckId, startDate);
    if (!stillUsed) {
        await ctx.prisma.trucksDriven.deleteMany({
            where: {DriverID: driverId, TruckID: truckId, DateDriven: startDate},
        });
    }
}

async function otherLoadsUseCustomerLoadType(
    ctx: any,
    excludeLoadId: number,
    customerId: number,
    loadTypeId: number,
): Promise<boolean> {
    const count = await ctx.prisma.loads.count({
        where: {
            ID: {not: excludeLoadId},
            CustomerID: customerId,
            LoadTypeID: loadTypeId,
            ...activeLoadWhere,
        },
    });
    return count > 0;
}

async function ensureCustomerLoadType(
    ctx: any,
    customerId: number,
    loadTypeId: number,
    startDate: Date,
): Promise<void> {
    const existing = await ctx.prisma.customerLoadTypes.findFirst({
        where: {CustomerID: customerId, LoadTypeID: loadTypeId},
    });
    if (!existing) {
        await ctx.prisma.customerLoadTypes.create({
            data: {CustomerID: customerId, LoadTypeID: loadTypeId, DateDelivered: startDate},
        });
    }
}

async function maybeRemoveCustomerLoadType(
    ctx: any,
    excludeLoadId: number,
    customerId: number,
    loadTypeId: number,
): Promise<void> {
    const stillUsed = await otherLoadsUseCustomerLoadType(ctx, excludeLoadId, customerId, loadTypeId);
    if (!stillUsed) {
        await ctx.prisma.customerLoadTypes.deleteMany({
            where: {CustomerID: customerId, LoadTypeID: loadTypeId},
        });
    }
}

async function otherLoadsUseCustomerDeliveryLocation(
    ctx: any,
    excludeLoadId: number,
    customerId: number,
    deliveryLocationId: number,
): Promise<boolean> {
    const count = await ctx.prisma.loads.count({
        where: {
            ID: {not: excludeLoadId},
            CustomerID: customerId,
            DeliveryLocationID: deliveryLocationId,
            ...activeLoadWhere,
        },
    });
    return count > 0;
}

async function ensureCustomerDeliveryLocation(
    ctx: any,
    customerId: number,
    deliveryLocationId: number,
    startDate: Date,
): Promise<void> {
    const existing = await ctx.prisma.customerDeliveryLocations.findFirst({
        where: {CustomerID: customerId, DeliveryLocationID: deliveryLocationId},
    });
    if (!existing) {
        await ctx.prisma.customerDeliveryLocations.create({
            data: {CustomerID: customerId, DeliveryLocationID: deliveryLocationId, DateUsed: startDate},
        });
    }
}

async function maybeRemoveCustomerDeliveryLocation(
    ctx: any,
    excludeLoadId: number,
    customerId: number,
    deliveryLocationId: number,
): Promise<void> {
    const stillUsed = await otherLoadsUseCustomerDeliveryLocation(
        ctx,
        excludeLoadId,
        customerId,
        deliveryLocationId,
    );
    if (!stillUsed) {
        await ctx.prisma.customerDeliveryLocations.deleteMany({
            where: {CustomerID: customerId, DeliveryLocationID: deliveryLocationId},
        });
    }
}

/** Sync trucksDriven / customer link rows after a load edit. */
export async function syncLoadRelationalRecords(
    ctx: any,
    before: LoadSnapshot,
    after: LoadSnapshot,
): Promise<void> {
    const {
        ID,
        DriverID,
        TruckID,
        StartDate,
        CustomerID,
        LoadTypeID,
        DeliveryLocationID,
    } = after;

    if (TruckID && DriverID && StartDate) {
        await ensureTrucksDriven(ctx, DriverID, TruckID, StartDate);
    }

    if (
        before.TruckID &&
        before.DriverID &&
        before.StartDate &&
        (before.TruckID !== TruckID ||
            before.DriverID !== DriverID ||
            before.StartDate.getTime() !== StartDate?.getTime())
    ) {
        await maybeRemoveTrucksDriven(ctx, ID, before.DriverID, before.TruckID, before.StartDate);
    }

    if (CustomerID && LoadTypeID && StartDate) {
        await ensureCustomerLoadType(ctx, CustomerID, LoadTypeID, StartDate);
    }

    if (
        before.CustomerID &&
        before.LoadTypeID &&
        (before.CustomerID !== CustomerID || before.LoadTypeID !== LoadTypeID)
    ) {
        await maybeRemoveCustomerLoadType(ctx, ID, before.CustomerID, before.LoadTypeID);
    }

    if (CustomerID && DeliveryLocationID && StartDate) {
        await ensureCustomerDeliveryLocation(ctx, CustomerID, DeliveryLocationID, StartDate);
    }

    if (
        before.CustomerID &&
        before.DeliveryLocationID &&
        (before.CustomerID !== CustomerID || before.DeliveryLocationID !== DeliveryLocationID)
    ) {
        await maybeRemoveCustomerDeliveryLocation(
            ctx,
            ID,
            before.CustomerID,
            before.DeliveryLocationID,
        );
    }
}
