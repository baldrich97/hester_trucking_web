import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteCustomers, RelatedCustomersModel, CompleteDailies, RelatedDailiesModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel, CompleteDrivers, RelatedDriversModel, CompleteLoadTypes, RelatedLoadTypesModel, CompleteWeeklies, RelatedWeekliesModel, CompleteLoads, RelatedLoadsModel } from "./index"

export const JobsModel = z.object({
  ID: z.number().int(),
  DriverID: z.number().int(),
  LoadTypeID: z.number().int(),
  CustomerID: z.number().int(),
  PaidOut: z.boolean(),
  TruckingRevenue: z.number().nullish(),
  CompanyRevenue: z.number().nullish(),
  TruckingRate: z.number(),
  CompanyRate: z.number(),
  DeliveryLocationID: z.number().int(),
  WeeklyID: z.number().int(),
  DailyID: z.number().int(),
  MaterialRate: z.number(),
  DriverRate: z.number(),
})

export interface CompleteJobs extends z.infer<typeof JobsModel> {
  Customers: CompleteCustomers
  Dailies: CompleteDailies
  DeliveryLocations: CompleteDeliveryLocations
  Drivers: CompleteDrivers
  LoadTypes: CompleteLoadTypes
  Weeklies: CompleteWeeklies
  Loads: CompleteLoads[]
}

/**
 * RelatedJobsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedJobsModel: z.ZodSchema<CompleteJobs> = z.lazy(() => JobsModel.extend({
  Customers: RelatedCustomersModel,
  Dailies: RelatedDailiesModel,
  DeliveryLocations: RelatedDeliveryLocationsModel,
  Drivers: RelatedDriversModel,
  LoadTypes: RelatedLoadTypesModel,
  Weeklies: RelatedWeekliesModel,
  Loads: RelatedLoadsModel.array(),
}))
