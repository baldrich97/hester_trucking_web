// src/server/router/index.ts
import { createRouter } from "./context";
import superjson from "superjson";

import { loadtypesRouter } from "./loadtypes";
import { customersRouter } from './customers';
import { statesRouter } from './states';
import { protectedExampleRouter } from "./protected-example-router";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("customers.", customersRouter)
  .merge("states.", statesRouter)
  .merge("auth.", protectedExampleRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
