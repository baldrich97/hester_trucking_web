import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteCustomers, RelatedCustomersModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel, CompleteDrivers, RelatedDriversModel, CompleteLoadTypes, RelatedLoadTypesModel, CompleteLoads, RelatedLoadsModel } from "./index"

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
})

export interface CompleteJobs extends z.infer<typeof JobsModel> {
  Customers: CompleteCustomers
  DeliveryLocations: CompleteDeliveryLocations
  Drivers: CompleteDrivers
  LoadTypes: CompleteLoadTypes
  Loads: CompleteLoads[]
}

/**
 * RelatedJobsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedJobsModel: z.ZodSchema<CompleteJobs> = z.lazy(() => JobsModel.extend({
  Customers: RelatedCustomersModel,
  DeliveryLocations: RelatedDeliveryLocationsModel,
  Drivers: RelatedDriversModel,
  LoadTypes: RelatedLoadTypesModel,
  Loads: RelatedLoadsModel.array(),
}))
