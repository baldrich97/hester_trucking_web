// src/server/router/index.ts
import {createRouter} from "./context";
import superjson from "superjson";

import {trucksRouter} from "./trucks";
import {customersRouter} from './customers';
import {driversRouter} from './drivers';
import {deliveryLocationsRouter} from './deliverylocations';
import {loadTypesRouter} from './loadtypes';
import {invoicesRouter} from './invoices';
import {statesRouter} from './states';
import {protectedExampleRouter} from "./protected-example-router";

export const appRouter = createRouter()
    .transformer(superjson)
    .merge("customers.", customersRouter)
    .merge('trucks.', trucksRouter)
    .merge('drivers.', driversRouter)
    .merge("deliverylocations.", deliveryLocationsRouter)
    .merge("loadtypes.", loadTypesRouter)
    .merge("invoices.", invoicesRouter)
    .merge("states.", statesRouter)
    .merge("auth.", protectedExampleRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
