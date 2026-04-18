import * as z from "zod"
import { CompleteCustomerDeliveryLocations, RelatedCustomerDeliveryLocationsModel, CompleteCustomers, RelatedCustomersModel, CompleteJobs, RelatedJobsModel, CompleteLoads, RelatedLoadsModel, CompleteWeeklies, RelatedWeekliesModel } from "./index"

export const DeliveryLocationsModel = z.object({
  ID: z.number().int(),
  Description: z.string(),
  Deleted: z.boolean().nullish(),
  CustomerID: z.number().int().nullish(),
})

export interface CompleteDeliveryLocations extends z.infer<typeof DeliveryLocationsModel> {
  CustomerDeliveryLocations: CompleteCustomerDeliveryLocations[]
  Customers?: CompleteCustomers | null
  Jobs: CompleteJobs[]
  Loads: CompleteLoads[]
  Weeklies: CompleteWeeklies[]
}

/**
 * RelatedDeliveryLocationsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedDeliveryLocationsModel: z.ZodSchema<CompleteDeliveryLocations> = z.lazy(() => DeliveryLocationsModel.extend({
  CustomerDeliveryLocations: RelatedCustomerDeliveryLocationsModel.array(),
  Customers: RelatedCustomersModel.nullish(),
  Jobs: RelatedJobsModel.array(),
  Loads: RelatedLoadsModel.array(),
  Weeklies: RelatedWeekliesModel.array(),
}))
