// src/server/router/index.ts
import {createRouter} from "./context";
import superjson from "superjson";

import {trucksRouter} from "./trucks";
import {customersRouter} from './customers';
import {driversRouter} from './drivers';
import {deliveryLocationsRouter} from './deliverylocations';
import {loadTypesRouter} from './loadtypes';
import {loadsRouter} from './loads';
import {invoicesRouter} from './invoices';
import {customerLoadTypesRouter} from './customerloadtypes';
import {customerDeliveryLocationsRouter} from './customerdeliverylocations';
import {statesRouter} from './states';
import {trucksDrivenRouter} from './trucksdriven';
import {dailiesRouter} from './dailies';
import {weekliesRouter} from './weeklies';
import {jobsRouter} from './jobs';
import {paystubsRouter} from "./paystubs";
import {protectedExampleRouter} from "./protected-example-router";

export const appRouter = createRouter()
    .transformer(superjson)
    .merge("customers.", customersRouter)
    .merge('trucks.', trucksRouter)
    .merge('drivers.', driversRouter)
    .merge("deliverylocations.", deliveryLocationsRouter)
    .merge("loadtypes.", loadTypesRouter)
    .merge("invoices.", invoicesRouter)
    .merge("customerloadtypes.", customerLoadTypesRouter)
    .merge("customerdeliverylocations.", customerDeliveryLocationsRouter)
    .merge("loads.", loadsRouter)
    .merge("states.", statesRouter)
    .merge("trucksdriven.", trucksDrivenRouter)
    .merge("dailies.", dailiesRouter)
    .merge("weeklies.", weekliesRouter)
    .merge("jobs.", jobsRouter)
    .merge("payStubs.", paystubsRouter)
    .merge("auth.", protectedExampleRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
