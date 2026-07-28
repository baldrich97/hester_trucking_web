/** Shared load list filter builder (discovery / mass-edit search). */

export type LoadListFilterInput = {
    customer?: number;
    driver?: number;
    truck?: number;
    loadType?: number;
    deliveryLocation?: number;
    search?: number | null;
    chosenLoad?: {
        MaterialRate?: number | null;
        TruckRate?: number | null;
        DriverRate?: number | null;
        TotalRate?: number | null;
        StartDate?: Date | string | null;
        Week?: string | null;
    } | null;
};

const RATE_EPSILON = 0.001;

function rateRange(value: number | null | undefined) {
    if (value == null) {
        return undefined;
    }
    return {gte: value - RATE_EPSILON, lte: value + RATE_EPSILON};
}

export function buildLoadFilters(input: LoadListFilterInput): Record<string, unknown> {
    const {customer, driver, truck, loadType, deliveryLocation, search, chosenLoad} = input;
    const materialRate = rateRange(chosenLoad?.MaterialRate);
    const truckRate = rateRange(chosenLoad?.TruckRate);
    const driverRate = rateRange(chosenLoad?.DriverRate);
    const totalRate = rateRange(chosenLoad?.TotalRate);

    return {
        ...(customer && {CustomerID: customer}),
        ...(driver && {DriverID: driver}),
        ...(truck && {TruckID: truck}),
        ...(loadType && {LoadTypeID: loadType}),
        ...(deliveryLocation && {DeliveryLocationID: deliveryLocation}),
        ...(search && {TicketNumber: search}),
        ...(materialRate && {MaterialRate: materialRate}),
        ...(truckRate && {TruckRate: truckRate}),
        ...(driverRate && {DriverRate: driverRate}),
        ...(totalRate && {TotalRate: totalRate}),
        ...(chosenLoad?.StartDate && {StartDate: chosenLoad.StartDate}),
        ...(chosenLoad?.Week && {Week: chosenLoad.Week}),
    };
}
