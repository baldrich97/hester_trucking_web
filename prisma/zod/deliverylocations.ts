import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteCustomers, RelatedCustomersModel, CompleteCustomerDeliveryLocations, RelatedCustomerDeliveryLocationsModel, CompleteJobs, RelatedJobsModel, CompleteLoads, RelatedLoadsModel } from "./index"

export const DeliveryLocationsModel = z.object({
  ID: z.number().int(),
  Description: z.string(),
  Deleted: z.boolean().nullish(),
  CustomerID: z.number().int().nullish(),
})

export interface CompleteDeliveryLocations extends z.infer<typeof DeliveryLocationsModel> {
  Customers?: CompleteCustomers | null
  CustomerDeliveryLocations: CompleteCustomerDeliveryLocations[]
  Jobs: CompleteJobs[]
  Loads: CompleteLoads[]
}

/**
 * RelatedDeliveryLocationsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedDeliveryLocationsModel: z.ZodSchema<CompleteDeliveryLocations> = z.lazy(() => DeliveryLocationsModel.extend({
  Customers: RelatedCustomersModel.nullish(),
  CustomerDeliveryLocations: RelatedCustomerDeliveryLocationsModel.array(),
  Jobs: RelatedJobsModel.array(),
  Loads: RelatedLoadsModel.array(),
}))
